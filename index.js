var Exec = require('broccoli-exec')
var colors = require('colors');

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
  if (!this['command']) {
    this.resolveCommand();
  }
}

MSBuild.prototype.resolveCommand = function() {
  this.command = 'xbuild';
  this.args = [
    '/nologo',
    '/verbosity:quiet',
    '/clp:NoSummary'
  ];

  if (!this['project']) {
    throw new Error('must specify project property on options for broccoli-msbuild');
  }

  this.args.push(this.project);

  if (this['targets']) {
    this.args.push('/t:' + this.targets)
  }

  if (this['configuration']) {
    this.args.push('/p:Configuration=' + this.configuration);
  }
  
  var props = this['properties'] || {};
  for (var p in props) {
    this.args.push('/p:' + p + '=' + props[p]);
  }
  // TODO: resolve msbuild.exe / xbuild based on os, bitness, version
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
