# CMAKE generated file: DO NOT EDIT!
# Generated by "Unix Makefiles" Generator, CMake Version 3.12

# Delete rule output on recipe failure.
.DELETE_ON_ERROR:


#=============================================================================
# Special targets provided by cmake.

# Disable implicit rules so canonical targets will work.
.SUFFIXES:


# Remove some rules from gmake that .SUFFIXES does not remove.
SUFFIXES =

.SUFFIXES: .hpux_make_needs_suffix_list


# Suppress display of executed commands.
$(VERBOSE).SILENT:


# A target that is always out of date.
cmake_force:

.PHONY : cmake_force

#=============================================================================
# Set environment variables for the build.

# The shell in which to execute make rules.
SHELL = /bin/sh

# The CMake executable.
CMAKE_COMMAND = /usr/local/cmake-3.12.4/bin/cmake

# The command to remove a file.
RM = /usr/local/cmake-3.12.4/bin/cmake -E remove -f

# Escaping for special characters.
EQUALS = =

# The top-level source directory on which CMake was run.
CMAKE_SOURCE_DIR = /home/travis/build/cheshirekow/cmake_format

# The top-level build directory on which CMake was run.
CMAKE_BINARY_DIR = /home/travis/build/cheshirekow/cmake_format/.build

# Utility rule file for vscode-extension.

# Include the progress variables for this target.
include cmake_format/vscode_extension/CMakeFiles/vscode-extension.dir/progress.make

cmake_format/vscode_extension/CMakeFiles/vscode-extension: cmake_format/vscode_extension/cmake-format-0.6.10.vsix


cmake_format/vscode_extension/cmake-format-0.6.10.vsix: cmake_format/vscode_extension/CHANGELOG.md
cmake_format/vscode_extension/cmake-format-0.6.10.vsix: cmake_format/vscode_extension/images/cmake-format-logo.png
cmake_format/vscode_extension/cmake-format-0.6.10.vsix: cmake_format/vscode_extension/images/small_demo.gif
cmake_format/vscode_extension/cmake-format-0.6.10.vsix: cmake_format/vscode_extension/LICENSE
cmake_format/vscode_extension/cmake-format-0.6.10.vsix: cmake_format/vscode_extension/package.json
cmake_format/vscode_extension/cmake-format-0.6.10.vsix: cmake_format/vscode_extension/package-lock.json
cmake_format/vscode_extension/cmake-format-0.6.10.vsix: cmake_format/vscode_extension/README.md
cmake_format/vscode_extension/cmake-format-0.6.10.vsix: cmake_format/vscode_extension/src/extension.ts
cmake_format/vscode_extension/cmake-format-0.6.10.vsix: cmake_format/vscode_extension/tsconfig.json
cmake_format/vscode_extension/cmake-format-0.6.10.vsix: cmake_format/vscode_extension/tslint.json
cmake_format/vscode_extension/cmake-format-0.6.10.vsix: cmake_format/vscode_extension/npm_install.stamp
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/home/travis/build/cheshirekow/cmake_format/.build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_1) "Generating cmake-format-0.6.10.vsix"
	cd /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension && /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension/node_modules/vsce/out/vsce package --baseImagesUrl https://raw.githubusercontent.com/cheshirekow/cmake_format/master/cmake_format/vscode_extension

cmake_format/vscode_extension/CHANGELOG.md: ../cmake_format/vscode_extension/CHANGELOG.md
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/home/travis/build/cheshirekow/cmake_format/.build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_2) "Generating CHANGELOG.md"
	cd /home/travis/build/cheshirekow/cmake_format && /usr/local/cmake-3.12.4/bin/cmake -E copy /home/travis/build/cheshirekow/cmake_format/cmake_format/vscode_extension/CHANGELOG.md /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension/CHANGELOG.md

cmake_format/vscode_extension/images/cmake-format-logo.png: ../cmake_format/vscode_extension/images/cmake-format-logo.png
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/home/travis/build/cheshirekow/cmake_format/.build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_3) "Generating images/cmake-format-logo.png"
	cd /home/travis/build/cheshirekow/cmake_format && /usr/local/cmake-3.12.4/bin/cmake -E copy /home/travis/build/cheshirekow/cmake_format/cmake_format/vscode_extension/images/cmake-format-logo.png /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension/images/cmake-format-logo.png

cmake_format/vscode_extension/images/small_demo.gif: ../cmake_format/vscode_extension/images/small_demo.gif
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/home/travis/build/cheshirekow/cmake_format/.build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_4) "Generating images/small_demo.gif"
	cd /home/travis/build/cheshirekow/cmake_format && /usr/local/cmake-3.12.4/bin/cmake -E copy /home/travis/build/cheshirekow/cmake_format/cmake_format/vscode_extension/images/small_demo.gif /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension/images/small_demo.gif

cmake_format/vscode_extension/LICENSE: ../cmake_format/vscode_extension/LICENSE
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/home/travis/build/cheshirekow/cmake_format/.build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_5) "Generating LICENSE"
	cd /home/travis/build/cheshirekow/cmake_format && /usr/local/cmake-3.12.4/bin/cmake -E copy /home/travis/build/cheshirekow/cmake_format/cmake_format/vscode_extension/LICENSE /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension/LICENSE

cmake_format/vscode_extension/package.json: ../cmake_format/vscode_extension/package.json
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/home/travis/build/cheshirekow/cmake_format/.build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_6) "Generating package.json"
	cd /home/travis/build/cheshirekow/cmake_format && /usr/local/cmake-3.12.4/bin/cmake -E copy /home/travis/build/cheshirekow/cmake_format/cmake_format/vscode_extension/package.json /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension/package.json

cmake_format/vscode_extension/package-lock.json: ../cmake_format/vscode_extension/package-lock.json
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/home/travis/build/cheshirekow/cmake_format/.build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_7) "Generating package-lock.json"
	cd /home/travis/build/cheshirekow/cmake_format && /usr/local/cmake-3.12.4/bin/cmake -E copy /home/travis/build/cheshirekow/cmake_format/cmake_format/vscode_extension/package-lock.json /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension/package-lock.json

cmake_format/vscode_extension/README.md: ../cmake_format/vscode_extension/README.md
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/home/travis/build/cheshirekow/cmake_format/.build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_8) "Generating README.md"
	cd /home/travis/build/cheshirekow/cmake_format && /usr/local/cmake-3.12.4/bin/cmake -E copy /home/travis/build/cheshirekow/cmake_format/cmake_format/vscode_extension/README.md /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension/README.md

cmake_format/vscode_extension/src/extension.ts: ../cmake_format/vscode_extension/src/extension.ts
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/home/travis/build/cheshirekow/cmake_format/.build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_9) "Generating src/extension.ts"
	cd /home/travis/build/cheshirekow/cmake_format && /usr/local/cmake-3.12.4/bin/cmake -E copy /home/travis/build/cheshirekow/cmake_format/cmake_format/vscode_extension/src/extension.ts /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension/src/extension.ts

cmake_format/vscode_extension/tsconfig.json: ../cmake_format/vscode_extension/tsconfig.json
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/home/travis/build/cheshirekow/cmake_format/.build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_10) "Generating tsconfig.json"
	cd /home/travis/build/cheshirekow/cmake_format && /usr/local/cmake-3.12.4/bin/cmake -E copy /home/travis/build/cheshirekow/cmake_format/cmake_format/vscode_extension/tsconfig.json /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension/tsconfig.json

cmake_format/vscode_extension/tslint.json: ../cmake_format/vscode_extension/tslint.json
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/home/travis/build/cheshirekow/cmake_format/.build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_11) "Generating tslint.json"
	cd /home/travis/build/cheshirekow/cmake_format && /usr/local/cmake-3.12.4/bin/cmake -E copy /home/travis/build/cheshirekow/cmake_format/cmake_format/vscode_extension/tslint.json /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension/tslint.json

cmake_format/vscode_extension/npm_install.stamp: cmake_format/vscode_extension/CHANGELOG.md
cmake_format/vscode_extension/npm_install.stamp: cmake_format/vscode_extension/images/cmake-format-logo.png
cmake_format/vscode_extension/npm_install.stamp: cmake_format/vscode_extension/images/small_demo.gif
cmake_format/vscode_extension/npm_install.stamp: cmake_format/vscode_extension/LICENSE
cmake_format/vscode_extension/npm_install.stamp: cmake_format/vscode_extension/package.json
cmake_format/vscode_extension/npm_install.stamp: cmake_format/vscode_extension/package-lock.json
cmake_format/vscode_extension/npm_install.stamp: cmake_format/vscode_extension/README.md
cmake_format/vscode_extension/npm_install.stamp: cmake_format/vscode_extension/src/extension.ts
cmake_format/vscode_extension/npm_install.stamp: cmake_format/vscode_extension/tsconfig.json
cmake_format/vscode_extension/npm_install.stamp: cmake_format/vscode_extension/tslint.json
cmake_format/vscode_extension/npm_install.stamp: ../cmake_format/vscode_extension/package.json
cmake_format/vscode_extension/npm_install.stamp: ../cmake_format/vscode_extension/package-lock.json
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --blue --bold --progress-dir=/home/travis/build/cheshirekow/cmake_format/.build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_12) "Generating npm_install.stamp"
	cd /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension && npm install
	cd /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension && touch npm_install.stamp

vscode-extension: cmake_format/vscode_extension/CMakeFiles/vscode-extension
vscode-extension: cmake_format/vscode_extension/cmake-format-0.6.10.vsix
vscode-extension: cmake_format/vscode_extension/CHANGELOG.md
vscode-extension: cmake_format/vscode_extension/images/cmake-format-logo.png
vscode-extension: cmake_format/vscode_extension/images/small_demo.gif
vscode-extension: cmake_format/vscode_extension/LICENSE
vscode-extension: cmake_format/vscode_extension/package.json
vscode-extension: cmake_format/vscode_extension/package-lock.json
vscode-extension: cmake_format/vscode_extension/README.md
vscode-extension: cmake_format/vscode_extension/src/extension.ts
vscode-extension: cmake_format/vscode_extension/tsconfig.json
vscode-extension: cmake_format/vscode_extension/tslint.json
vscode-extension: cmake_format/vscode_extension/npm_install.stamp
vscode-extension: cmake_format/vscode_extension/CMakeFiles/vscode-extension.dir/build.make

.PHONY : vscode-extension

# Rule to build all files generated by this target.
cmake_format/vscode_extension/CMakeFiles/vscode-extension.dir/build: vscode-extension

.PHONY : cmake_format/vscode_extension/CMakeFiles/vscode-extension.dir/build

cmake_format/vscode_extension/CMakeFiles/vscode-extension.dir/clean:
	cd /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension && $(CMAKE_COMMAND) -P CMakeFiles/vscode-extension.dir/cmake_clean.cmake
.PHONY : cmake_format/vscode_extension/CMakeFiles/vscode-extension.dir/clean

cmake_format/vscode_extension/CMakeFiles/vscode-extension.dir/depend:
	cd /home/travis/build/cheshirekow/cmake_format/.build && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /home/travis/build/cheshirekow/cmake_format /home/travis/build/cheshirekow/cmake_format/cmake_format/vscode_extension /home/travis/build/cheshirekow/cmake_format/.build /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension /home/travis/build/cheshirekow/cmake_format/.build/cmake_format/vscode_extension/CMakeFiles/vscode-extension.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : cmake_format/vscode_extension/CMakeFiles/vscode-extension.dir/depend

