var Exec = require('broccoli-exec')
var colors = require('colors')
var Promise = require('rsvp').Promise

module.exports = MSBuild

MSBuild.prototype = Object.create(Exec.prototype)
MSBuild.prototype.constructor = MSBuild
function MSBuild (inputTree, options) {
  if (!(this instanceof MSBuild)) return new MSBuild(inputTree, options)
  this.inputTree = inputTree;
  
  for (var prop in options) {
    this[prop] = options[prop];
  }

  if (!this['verbosity']) {
    this.verbosity = 'error';
  }

  this.resolveCommand();
  this.prepareArgs();
}

MSBuild.prototype.prepare = function(srcDir, destDir) {
  var self = this;
  return this.resolveCommand().then(function() {
    return Exec.prototype.prepare.apply(self, [srcDir, destDir]);
  })
}

MSBuild.prototype.resolveCommand = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    if (self.command) {
      resolve();
      return;
    }

    if (process.platform === 'win32') {
      self.resolveMSBuild().then(function(command) {
        self.command = command;
        resolve();
      }, function(err) {
        reject(err);
      });
    } else {
      self.command = 'xbuild';
      resolve();
    }
  });
}

MSBuild.prototype.resolveMSBuild = function() {
  var self = this;
  return new Promise(function(resolve, reject) {
    var winreg = require('winreg');
    regKey = new winreg({
        hive: winreg.HKLM,
        key:  '\\Software\\Microsoft\\MSBuild\\ToolsVersions'
      });

    regKey.keys(function (err, items) {
      if (err) {
        reject('Error probing ' + regKey.hive + regKey.key + ': ' + err);
        return;
      }

      var versions = items.map(function(i) {
        var parts = i.path.split('\\');
        return {key: i.key, version: parseFloat(parts[parts.length - 1]) };
      });

      if (versions.length == 0) {
        reject('Failed to locate MSBuild in registry ' + regKey.hive + regKey.key);
        return;
      }

      var selectedVersion = null;

      if (self.toolsVersion) {
        require('array.prototype.find');

        var desiredToolsVersion = parseFloat(self.toolsVersion);
        var selectedVersion = versions.find(function(i) {
          return i.version === desiredToolsVersion;
        });

        if (!selectedVersion) {
          reject('Failed to locate MSBuild version ' + self.toolsVersion + ' in registry ' + regKey.hive + regKey.key)
          return;
        }
      } else {
        versions.sort(function(a, b) {
          if (a.version < b.version) return -1;
          if (a.version > b.version) return 1;

          // unlikely:
          return 0;
        });

        selectedVersion = versions[versions.length - 1];
      }

      var pathKey = new winreg({
        hive: winreg.HKLM,
        key:  selectedVersion.key
      });

      pathKey.get('MSBuildToolsPath', function(err, key) {
        if (err) {
          reject('Error probing ' + pathKey.hive + pathKey.key + ': ' + err);
          return;
        }

        resolve(require('path').join(key.value, 'MSBuild.exe'));
      });
      
    });
  });
}

MSBuild.prototype.prepareArgs = function() {
  if (!this['project']) {
    throw new Error('must specify project property on options for broccoli-msbuild');
  }

  var providedArgs = this.args || [];

  this.args = [];

  this.args.concat([
    '/nologo',
    '/verbosity:quiet',
    '/clp:NoSummary'
  ]);

  this.args.push(this.project);

  if (this['targets']) {
    this.args.push('/t:' + this.targets)
  }
  
  var props = this['properties'] || {};
  for (var p in props) {
    this.args.push('/p:' + p + '=' + props[p]);
  }

  if (this['configuration']) {
    this.args.push('/p:Configuration=' + this.configuration);
  }

  this.args.concat(providedArgs);
}

MSBuild.prototype.log = function (data) {
  data = data.toString();
  if (data.match(/:\s*error/i)) {
    console.log(data.red);
  } else if (data.match(/:\s*warning/i)) {
    if (this.verbosity === 'warning' || this.verbosity === 'info') {
      console.log(data.yellow);
    }
  } else {
    if (this.verbosity === 'info') {
      console.log(data);
    }
  }
}
