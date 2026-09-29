# q.sh <pdfpage> <staff>  -> zz/q<pg>-<st>-{1..4}.png at 3x
i=1; for p in 0.06:0.3 0.28:0.52 0.5:0.74 0.72:0.96; do a=${p%:*}; b=${p#*:}; K=3 node zoom.mjs st/p$1-$2.png $a $b zz/q$1-$2-$i.png; i=$((i+1)); done
