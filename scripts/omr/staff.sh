# staff.sh <pg> <ycentro> <nome>  -> c<pg>/<nome>.png (pauta inteira) + 4 quartos + cabeças detectadas
pg=$1; y=$2; n=$3; mkdir -p c$pg
a=$(python3 -c "print(round($y-0.028,4))"); b=$(python3 -c "print(round($y+0.028,4))")
node crop.mjs $pg $a $b c$pg/$n.png 0.04 0.93 >/dev/null
j=1; for x in "0.04 0.27" "0.26 0.49" "0.48 0.71" "0.70 0.93"; do node crop.mjs $pg $a $b c$pg/$n-$j.png $x >/dev/null; j=$((j+1)); done
node nh.mjs c$pg/$n.png | awk '{printf "%s%s(%s,%s) ", ($3>=38&&$4>=32)?"":"~", $5, $1, $2} END{print ""}'
