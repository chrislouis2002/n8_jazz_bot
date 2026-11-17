#!/bin/bash
export HOME="/Users/chrislouis"
exec /usr/bin/ssh -t -R 80:127.0.0.1:3000 \
-i /Users/chrislouis/.ssh/id_ed25519 \
-o IdentitiesOnly=yes \
-o ServerAliveInterval=30 \
-o ServerAliveCountMax=3 \
stable@proxy.tunnl.gg
