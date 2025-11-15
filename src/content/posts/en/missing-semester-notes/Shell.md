---
title: "Shell & Command-Line Tools"
description: "MIT Missing Semester Notes on Shell & Command-Line Tools"
date: 2025-08-21
lang: "en"
translationSlug: "missing-semester-notes/shell-and-command-line-tools"
author: "konakona"
---

## The Basics

- `cd -` goes to the previous directory.
- `cd ~`: `~` expands to the current user's home directory.
- `ctrl + l` clears the screen.
- `<` redirects the content after it to the executable before it.
- `tail`
  - `-n` limits the line count.
  - `-f` means follow, tail monitors the file and prints the last few lines in real time.
  - `-r` displays the lines in reverse order.
- `# echo > /sys/net/ipv4_forward` `#` indicates that this command is to be run as root. `$` means non-root.
- `tee` sends the input to the output while also prints it to stdout.
- commands before and after `|` and `<` `>` are unaware of each other, so be careful about where you put sudo to give appropriate permissions to appropriate executables.
- Note that echo does not interpret `\n` as new line without the -e option.
- `du -sh` prints out the size of a directory in a human readable way.
- `chmod`: 4 -> r; 2 ->w ; 1 -> x. Numbers can be added to give multiple permissions.
  - `777`: all rwx
  - `755`: rwx for u, r-x for g&o

## Shell Tools and Scripting

- single quotes and double quotes are treated differently in bash. Single quotes preserve the **exact** characters inside, while double quotes expands any expressions and allows for escape sequences.
- Reserved argument names
  - `$0` - Name of the script
  - `$1` to `$9` - Arguments to the script. `$1` is the first argument and so on.
  - `$@` - All the arguments
  - `$#` - Number of arguments
  - `$?` - Return code of the previous command
  - `$$` - Process identification number (PID) for the current script
  - `!!` - Entire last command, including arguments. A common pattern is to execute a command only for it to fail due to missing permissions; you can quickly re-execute the command with sudo by doing `sudo !!`. See the example below
  - `$_` - Last argument from the last command. If you are in an interactive shell, you can also quickly get this value by typing `Esc` followed by `.` or `Alt+.`

```bash
mkdir /usr/foo # won't work
sudo !! # -> gets you to sudo mkdir /usr/foo
```

- short-circuiting / concatenating commands
  - `||` executes the second command if the first one fails (non-zero)
  - `&&` executes the second command if the first one succeeds (0)
  - `;` just concatenates; same as running those commands separately

```bash
false || echo "Oops, fail"
# Oops, fail

true || echo "Will not be printed"
#

true && echo "Things went well"
# Things went well

false && echo "Will not be printed"
#

true ; echo "This will always run"
# This will always run

false ; echo "This will always run"
# This will always run
```

- `$([Command])` expands the command output; while more interestingly, `<([Command])` stores the command output in a "file" and exposes itself as that file. This is useful when you have a command that expects the input to be from a file instead of from stdin. Example:

```bash
cat <(ls) <(ls -l ..) # btw cat can take multiple arguments.
```

- If we don't want the output of a certain command to be printed to stdout, use `/dev/null`. `[Command] > /dev/null 2> /dev/null` will effectively hide stdout and stderr. Here, [[Linux#^575176|2 stands for file descriptor (stderr).]] [[Snippets#How redirection works|Further explanation]]

It is good practice to write shebang lines using the [`env`](https://www.man7.org/linux/man-pages/man1/env.1.html) command that will resolve to wherever the command lives in the system, increasing the portability of your scripts. The shebang line would look like `#!/usr/bin/env python3`.

### Using `find`

- `-name` `-iname` to specify file names and whether you care about the case
- `-path` can be used with wildcards: `find . -path "**/test/*.py"`
- remember to use `**` to match any depths of directories
- `-type` can restrict file type: `f` or `d`
- `-u` searches for hidden files
- `find root_path -name '*.ext' -exec wc -l {} \;` find can also be used to execute commands on found files. Use `{}` to access the filename.

### Using `ls`

- `-r` to reverse sort orders
- `-t` & `-u` for modifications date or access date respectively
- `-h` for human readable file sizes in `-l` mode
- `-a` shows hidden files (starts with a dot `.`), while `-A` shows hidden files except for `.` and `..`
- - `la` is actually an abbreviation for `ls -lAh`

### Using `xargs`

`xargs` reads items from standard input (or a file) and builds/executing command lines using those items as arguments — useful for commands that don't handle piped input directly.

You can use `xargs` to:

- Convert input to arguments
- Use with find to execute cmd
- Limit arguments per command
- Run multiple processes

| **Option** | **Description**                                                         |
| ---------- | ----------------------------------------------------------------------- |
| `-n N`     | Use N items per command invocation                                      |
| `-0`       | Work with NUL‐separated input (safe for filenames with spaces/newlines) |
| `-I {}`    | Replace {} placeholder in command                                       |
| `-P N`     | Run up to N processes in parallel                                       |
| `-d ""`    | Specify a delimiter that separates each item                            |

```shell
find . -type f -name "*.log" | xargs -d "\n" -I{} mv {} {}.bak
# Rename all log files as its own backup; 
# "\n" used as delimiter to avoid blank space being used
xargs -n 1 -P 8 wget -c < urls.txt
# Download from urls.txt concurrently in 8 processes
```

### Using `grep`

- `-i` — Ignore case (grep -i "pattern" file)
- `-w` — Match whole words only
- `-E` — Use extended regex (equivalent to egrep)
- `-F` — Interpret pattern as a fixed string (not regex)
- `-n` — Show line numbers
- `-h` — Hide filename (useful with multiple files)
- `-o` — Print only the matching part
- `-c` — Count matching lines
- `-q` — Quiet mode (exit status only, no output)
- `-v` — Invert match — excludes the line that match the pattern
- `-A` N — Show N lines **after** match
- `-B` N — Show N lines **before** match
- `-C` N — Show N lines **around** (before and after) Tip: `C` stands for `context`
- `--exclude=PATTERN` — **Exclude** a line if it contains the pattern

### Examples

```shell
#!/bin/bash

echo "Starting program at $(date)"

echo "Starting program $0 with $# arguments with pid $$"

for file in "$@"; do
    grep foobar "$file" > /dev/null 2> /dev/null
    if [[ "$?" -ne 0 ]]; then
        echo "File $file does not have any foobar, appending one to it."
        echo "# foobar" >> "$file"
    fi
done
```

```shell
convert image.{png,jpg}

cp /path/to/project/{foo,bar,baz}.sh /newpath

# Globbing techniques can also be combined
mv *{.py,.sh} folder
# Will move all *.py and *.sh files

mkdir foo bar
# This creates files foo/a, foo/b, ... foo/h, bar/a, bar/b, ... bar/h
touch {foo,bar}/{a..h}
touch foo/x bar/y
# Show differences between files in foo and bar
diff <(ls foo) <(ls bar)
```

Tips:

- `-ne` means `not equal to`
- use `man test` to lookup conditionals
- in `bash`/`zsh`, `[[ ... ]]` is recommended
- `(( … ))` performs **C-style integer arithmetic**
- use `?` and `*` to match one or any amount of characters respectively
- `{a,b}`,`{a..z}` can be expanded by shell

## Data Wrangling

Example: `cat ssh.log | sed 's/pattern/\2/'`

- `s` is for replace
- `sed` uses `/` to separate arguments
- the code above means substituting the first argument with the one in the second argument. In this case, `\2` refers to the second captured group.
- `-E` option is recommended for modern regex syntax. Note that `\w\d` won't work. The same goes for grep and a bunch of other tools.
- `g` means global. sed `'s/pattern/\2/g'` means substituting all matches
- `'/pattern/d'`: delete lines matching this pattern
- Multiple edits: `sed -e 's/foo/bar/' -e 's/baz/qux/'`
- `[[:space:]]` matches spaces
- Deleting lines with line numbers:
  - `sed 'Nd'`
  - `sed 'n,Nd'`

---

- `uniq` removes duplicates from the result of `sort`. `-c` outputs the duplication count in the first column
- `sort` sorts lines with the specified column. By default it sorts by character.
  - `-n` — Numeric sort
  - `-V` — Version number sort
  - `-h` — Human-readable numeric sort (1K, 2M, etc.)
  - `-k N` — Sort by field N (e.g., -k2 for second column)
  - `-k M,N` — Sort using fields M through N
- `head` & `tail`, used with `-n NUMBER`

---

Example: `awk '$1 == 1 && $2 ~ /^c[^ ]*e$/ { print $2, $4 }' | wc -l`

- `awk` a column-based stream editor
  - `$x` stands for column x. btw `$0` refers to the whole line
  - `~` matches the content of a column with a regex pattern
  - statements inside `{}` will be executed if the previous condition checks passed
  - if a regex pattern match is the only condition, use `awk '/pattern/ { print … }'`
  - `-F FS` sets the field separator (FS), or delimiter. Default is whitespaces
  - Built-in vars: `NR` (line count), `NF` (field count), `FS` (input separator), `OFS` (output separator)
  - `START`/`END` runs before & after input processing respectively
  - `awk` is a programming language. So you can:
    - assign/use vars: `awk '{ x = $2 * 2; print x }'`
    - do arithmetic: `awk '{ sum += $2 } END { print sum/NR }'`

---

- `paste`: used to merge multiple lines in multiple files horizontally.
  - `-d` for delimiter
  - `-s` paste the lines one at a time, instead of in parallel. Useful for reducing multiple lines of content into a single line with the delimiter as the separator.
Example:

```bash
# file 1:
# 1
# 2
# 3

# file 2:
# 4
# 5
# 6

$ paste -d, 1 2 # "zips" two files together
# 1,4
# 2,5
# 3,6

$ paste -sd, 1
# 1,2,3

$ paste -sd\| 1
# 1|2|3
```

---

- `bc`: a numerical calculator. Takes math expression from `stdin`. Use with the `-l` option. (modernization)
- `-` stands for `stdout` for those parameters expecting a file
- `less` is a pager command that makes long files more human readable.

## Command-line Environment

### Port Forwarding through `ssh`

You would frequently run into cases where your remote server is running a service on a certain port that's not exposed to the public internet, but in the meantime no reverse proxy is setup to forward access to this port (because it's still under development or other reasons).

In such case you would use **ssh port forwarding** to forward calls to a local port to a port on the remote machine, but proxy that call through `ssh` 22 port, which is almost definitely open.

Example: `ssh -N -L <local_port>:localhost:<remote_port> user@exmaple.com`

- `-L` specifies you want port forwarding to work
- `-N` tells ssh to avoid opening up a remote shell and just establish a tunnel for port forwarding

### Job Control

- `ps aux | grep PATTERN` gets you details of a certain process
- `pgrep "process_name parameters` is a convenient way to get the pid for a process or a command you've started
- `pkill -af` finds a process with the specified name and kills it
  - `-a` ensures that ancestor process are also killed
  - `-f` matches against full command, not just the process name

## Version Control with `git`

## Git Terminology

File structure:

- `blob` -> `array<byte>` -> files
- `tree` -> `map<string, tree|blob>` -> directories
- `commit` -> a composition of id, trees and files along with metadata
- `snapshot` -> the root directory (tree) of a git repo can be captured as a `snapshot`

```plaintext
struct {
    parents -> array<commit>
    author -> string
    message -> string
    snapshot -> tree
}
```

- `object` -> `blob | tree | commit` -> all things are objects, referred to by their SHA-1 hash
- use `git cat-file -p <hash>` to inspect the content of any object
- `references` -> `HEAD`, branch names
- references are mutable, but the history itself is immutable

### Useful Commands

- `git add -p` -> interactive staging: used to stage only certain parts in a files
- `git diff --cached` -> only see staged diffs
- `git diff <version1>(optional) <version2> <filename>`
- `git log --all --graph --decorate --oneline` -> prettier log command
- `git checkout -b` -> creates and checkouts to a new branch
- `git mergetool` -> a fancy tool to help resolve merge conflicts (`vimdiff`)
- `git reset HEAD <file>` -> **unstage** a file
- `git checkout -- <file>` -> **discard** changes
- `git blame <file>` -> find out who wrote a certain line
- `git-filter-repo` -> removing sensitive data from history
