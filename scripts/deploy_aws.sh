#!/usr/bin/env bash
# Publica o site (pasta site/) na AWS como site estático: S3 + CloudFront (HTTPS).
#
# Pré-requisitos: AWS CLI v2 configurado (aws configure) com permissão para S3 e CloudFront.
# Uso:  ./scripts/deploy_aws.sh <nome-unico-do-bucket> [regiao]
# Ex.:  ./scripts/deploy_aws.sh partitura-viva-mvp us-east-1
#
# Rodar de novo só reenvia os arquivos e limpa o cache do CloudFront.
set -euo pipefail

BUCKET="${1:?informe o nome do bucket (único na AWS), ex.: partitura-viva-mvp}"
REGION="${2:-us-east-1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/site"

# Falhar antes de criar recursos caso a sessão AWS não esteja disponível.
export AWS_PAGER=""
export AWS_EC2_METADATA_DISABLED=true
export AWS_REGION="$REGION"
export AWS_DEFAULT_REGION="$REGION"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
echo "Conta AWS: $ACCOUNT | Região: $REGION"

echo "== 1/4 Bucket s3://$BUCKET ($REGION)"
if ! aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
  aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
fi

echo "== 2/4 Enviando arquivos"
aws s3 sync "$SITE" "s3://$BUCKET" --delete \
  --exclude "*.DS_Store" --exclude "*.whl" --exclude "*.zip" \
  --exclude "*.pyc" --exclude "__pycache__/*" --exclude ".env*"
aws s3 cp "s3://$BUCKET/licoes/" "s3://$BUCKET/licoes/" --recursive --exclude "*" --include "*.txt" \
  --content-type "text/plain; charset=utf-8" --metadata-directive REPLACE >/dev/null
aws s3 cp "$SITE/index.html" "s3://$BUCKET/index.html" --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache"

echo "== 3/4 CloudFront (HTTPS)"
DIST_ID=$(aws cloudfront list-distributions --query \
  "DistributionList.Items[?Origins.Items[0].DomainName=='$BUCKET.s3.$REGION.amazonaws.com'].Id | [0]" --output text 2>/dev/null || true)
if [ -z "$DIST_ID" ] || [ "$DIST_ID" = "None" ]; then
  OAC_ID=$(aws cloudfront create-origin-access-control --origin-access-control-config \
    "Name=$BUCKET-oac,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
    --query OriginAccessControl.Id --output text)
  CFG=$(mktemp)
  cat > "$CFG" <<JSON
{
  "CallerReference": "$BUCKET-$(date +%s)",
  "Comment": "Partitura Viva MVP",
  "DefaultRootObject": "index.html",
  "Enabled": true,
  "PriceClass": "PriceClass_100",
  "Origins": {"Quantity": 1, "Items": [{
    "Id": "s3", "DomainName": "$BUCKET.s3.$REGION.amazonaws.com",
    "S3OriginConfig": {"OriginAccessIdentity": ""}, "OriginAccessControlId": "$OAC_ID"}]},
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3", "ViewerProtocolPolicy": "redirect-to-https",
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6", "Compress": true,
    "AllowedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]}}
}
JSON
  DIST_ID=$(aws cloudfront create-distribution --distribution-config "file://$CFG" --query Distribution.Id --output text)
  aws s3api put-bucket-policy --bucket "$BUCKET" --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{\"Effect\": \"Allow\", \"Principal\": {\"Service\": \"cloudfront.amazonaws.com\"},
      \"Action\": \"s3:GetObject\", \"Resource\": \"arn:aws:s3:::$BUCKET/*\",
      \"Condition\": {\"StringEquals\": {\"AWS:SourceArn\": \"arn:aws:cloudfront::$ACCOUNT:distribution/$DIST_ID\"}}}]}"
  echo "Distribuição criada ($DIST_ID). A primeira publicação leva ~5–15 min para ficar no ar."
else
  aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" >/dev/null
fi

echo "== 4/4 Endereço"
DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" --query Distribution.DomainName --output text)
echo "Site: https://$DOMAIN"
