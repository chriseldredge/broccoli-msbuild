## broccoli-exec

A [Broccoli](https://github.com/joliss/broccoli) plugin that uses
[broccoli-exec](https://github.com/chriseldredge/broccoli-exec)
to execute MSBuild (or xbuild).

### Usage

This silly example finds files in the source tree and does a word count on each file,
writing the summary into wc.txt in the output tree:

```js
var msbuild = require('broccoli-msbuild');

var msbuildTree = msbuild('src', {
  project: 'MyProject.proj',
  targets: 'Build',
  configuration: 'Release',
  properties: {
    DestDir: '{destDir}'
  }
});
```

### Notes

#### Performance

The entire input tree is copied to a temp directory by Broccoli, meaning instead of executing MSBuild
on a file in e.g. `src/MyProject.proj`, everything in `src` is copied to e.g. `tmp/msbuild-tmp_cache_dir-21XzhB25.tmp`
and MSBuild is invoked on the project in that directory.

This means if your MSBuild source tree is very large or uses NuGet automatic package restore, package
download will occur in the temp directory instead of reusing e.g. `src/packages`.

You can avoid this performance issue by only watching for changes to `*.cs` files, then using the absolute
path to the project you want to build in its original location:

```js
var select = require('broccoli-select');

var msbuildInputTree = select('src', {
  acceptFiles: [ '**/*.cs' ],
  outputDir: '/build'
});

var msbuildTree = msbuild(msbuildInputTree, {
  project: require('path').join(__dirname, 'src', 'MyProject.proj'),
  properties: {
    DestDir: '{destDir}'
  }
});
```

Doing this still copies some files into a temp directory, but effectively they are ignored. This allows
`broccoli serve` to re-execute MSBuild only when a `.cs` file has changed.

#### Staging Output

By default if you build a project or solution with MSBuild, it will compile assets into the same tree as
the source files. You probably want to write your own MSBuild `.proj` file that compiles your solution as
normal, then copies content and binaries into `$(DestDir)`, which gets passed in by the above examples.

Every .NET project has different conventions and configuration for publishing projects so this is left
as an exercise for the project consuming broccoli-msbuild.

## Options

Name          | Required | Description
----          | -------- | -----------
project       | true     | The project file that MSBuild should build
targets       |          | Target(s) to build, delimited by semicolon to build (using `/t:` switch)
configuration |          | Configuration (`'Debug'`, `'Release'`) to build (using `/p:Configuration=xyz` switch)
verbosity     |          | Logging verbosity (`'error'` (default), `'warning'` or `'info'`)
properties    |          | Hash of properties to pass to MSBuild (using `/p:Name=Value` switches)
command       |          | Location of MSBuild.exe / xbuild to invoke (see Tool Resolution section)
toolsVersion  |          | Specify a particular version of MSBuild to use (e.g. `'3.5'`, `'4.0'`, `'12.0'`)

## Tool Resolution

When running on Windows, the registry key `HKLM\Software\Microsoft\MSBuild\ToolsVersions` is probed
to resolve the location of MSBuild.exe.

When `toolsVersion` is specified, that particular version will be probed to find the appropriate `MSBuildToolsPath`
value.

When no `toolsVersion` is specified, the highest version of MSBuild is selected automatically.

When *not* running on Windows, it is assumed that `xbuild` is available on `$PATH`.

You can also hard-code a path to MSBuild.exe or xbuild on any operating system by explicitly setting
`command`.

### License

MIT