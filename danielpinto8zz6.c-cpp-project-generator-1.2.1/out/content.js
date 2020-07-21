"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasks_json = { "version": "2.0.0", "tasks": [{ "label": "build", "type": "shell", "group": { "kind": "build", "isDefault": true }, "windows": { "command": "powershell" }, "linux": { "command": "bash" }, "osx": { "command": "bash" }, "args": ["-c", "make"] }, { "label": "build & run", "type": "shell", "group": { "kind": "test", "isDefault": true }, "windows": { "command": "powershell" }, "linux": { "command": "bash" }, "osx": { "command": "bash" }, "args": ["-c", "'make run'"] }, { "label": "clean", "type": "shell", "windows": { "command": "powershell" }, "linux": { "command": "bash" }, "osx": { "command": "bash" }, "args": ["-c", "'make clean'"] }] };
exports.launch_json = { "version": "0.2.0", "configurations": [{ "name": "Debug", "type": "cppdbg", "request": "launch", "miDebuggerPath": "gdb", "program": "${workspaceFolder}/bin/main", "args": [], "stopAtEntry": false, "cwd": "${workspaceRoot}", "environment": [], "externalConsole": true, "preLaunchTask": "build", "linux": { "MIMode": "gdb" }, "osx": { "MIMode": "lldb" }, "windows": { "MIMode": "gdb" } }] };
exports.makefile_c = 'CC\t\t:= gcc\nCFLAGS\t:= -Wall -Wextra -g\n\nBIN\t\t:= bin\nSRC\t\t:= src\nINCLUDE\t:= include\nLIB\t\t:= lib\n\nLIBRARIES\t:=\n\nifeq ($(OS),Windows_NT)\nEXECUTABLE\t:= main.exe\nelse\nEXECUTABLE\t:= main\nendif\n\nSOURCEDIRS\t:= $(shell find $(SRC) -type d)\nINCLUDEDIRS\t:= $(shell find $(INCLUDE) -type d)\nLIBDIRS\t\t:= $(shell find $(LIB) -type d)\n\nCINCLUDES\t:= $(patsubst %,-I%, $(INCLUDEDIRS:%/=%))\nCLIBS\t\t:= $(patsubst %,-L%, $(LIBDIRS:%/=%))\n\nSOURCES\t\t:= $(wildcard $(patsubst %,%/*.c, $(SOURCEDIRS)))\nOBJECTS\t\t:= $(SOURCES:.c=.o)\n\n\nall: $(BIN)/$(EXECUTABLE)\n\n.PHONY: clean\nclean:\n\t-$(RM) $(BIN)/$(EXECUTABLE)\n\t-$(RM) $(OBJECTS)\n\n\nrun: all\n\t./$(BIN)/$(EXECUTABLE)\n\n$(BIN)/$(EXECUTABLE): $(OBJECTS)\n\t$(CC) $(CFLAGS) $(CINCLUDES) $(CLIBS) $^ -o $@ $(LIBRARIES)';
exports.makefile_cpp = 'CC\t\t:= g++\nC_FLAGS := -std=c++17 -Wall -Wextra -g\n\nBIN\t\t:= bin\nSRC\t\t:= src\nINCLUDE\t:= include\nLIB\t\t:= lib\n\nLIBRARIES\t:=\n\nifeq ($(OS),Windows_NT)\nEXECUTABLE\t:= main.exe\nelse\nEXECUTABLE\t:= main\nendif\n\nall: $(BIN)/$(EXECUTABLE)\n\nclean:\n\t$(RM) $(BIN)/$(EXECUTABLE)\n\nrun: all\n\t./$(BIN)/$(EXECUTABLE)\n\n$(BIN)/$(EXECUTABLE): $(SRC)/*.cpp\n\t$(CC) $(C_FLAGS) -I$(INCLUDE) -L$(LIB) $^ -o $@ $(LIBRARIES)';
exports.main_cpp = '#include <iostream>\n\nint main(int argc, char *argv[]) {\n\tstd::cout << "Hello Easy C++ project!" << std::endl;\n}';
exports.main_c = '#include <stdio.h>\n\nint main(int argc, char *argv[]) {\n\tprintf("Hello World");\n\n\treturn(0);\n}';
exports.directories = new Array(".vscode", "bin", "include", "lib", "src");
//# sourceMappingURL=content.js.map