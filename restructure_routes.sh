#!/bin/bash

# Move existing YUWFFL routes into /yuwffl
mkdir -p src/app/yuwffl
mv src/app/calendar src/app/yuwffl/
mv src/app/rosters src/app/yuwffl/
mv src/app/stats src/app/yuwffl/
mv src/app/matches src/app/yuwffl/

# Create Red Team play-by-play framework by copying the YUWFFL one
mkdir -p src/app/red-team/matches/[id]/play-by-play
cp src/app/yuwffl/matches/[id]/play-by-play/AdminView.tsx src/app/red-team/matches/[id]/play-by-play/RedAdminView.tsx
cp src/app/yuwffl/matches/[id]/play-by-play/ViewerView.tsx src/app/red-team/matches/[id]/play-by-play/RedViewerView.tsx
cp src/app/yuwffl/matches/[id]/play-by-play/page.tsx src/app/red-team/matches/[id]/play-by-play/page.tsx

echo "All routes moved and copied successfully!"
