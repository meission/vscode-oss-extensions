file(REMOVE_RECURSE
  "CMakeFiles/vscode-extension"
  "cmake-format-0.6.10.vsix"
  "CHANGELOG.md"
  "images/cmake-format-logo.png"
  "images/small_demo.gif"
  "LICENSE"
  "package.json"
  "package-lock.json"
  "README.md"
  "src/extension.ts"
  "tsconfig.json"
  "tslint.json"
  "npm_install.stamp"
)

# Per-language clean rules from dependency scanning.
foreach(lang )
  include(CMakeFiles/vscode-extension.dir/cmake_clean_${lang}.cmake OPTIONAL)
endforeach()
