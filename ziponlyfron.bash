tar -czf ../$(date +%Y%m%d%H%M)-intern_tracker_kofi_only_front_v23.tar.gz --exclude=node_modules   --exclude=backend  --exclude=backend/.vscode --exclude=backend/docs --exclude=docs  --exclude=archive.tar.gz --exclude=dist --exclude=test-results --exclude=zip.bash --exclude=klirr --exclude=.env_all_settings   --exclude=package-lock.json  --exclude=.claude  --exclude=.git --exclude=.temp_keys --exclude=.dir_bash_history --exclude=./static/.dir_bash_history  --exclude=./static/node_modules  --exclude=./backend/.claude --show-omitted-dirs --preserve-permissions .

ls -lahctrl ../
#
