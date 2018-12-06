for filename in dist/*.js; do
    [ -e "$filename" ] || continue
    echo $filename
    ns -u $filename
done
