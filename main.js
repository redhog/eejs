/*
 * Copyright (c) 2011 RedHog (Egil Möller) <egil.moller@freecode.no>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* Basic usage:
 *
 * require("./index").require("./examples/foo.ejs")
 */

var ejs = require("ejs");
var fs = require("fs");
var path = require("path");
var resolve = require("resolve");

/* function(name, args) {};
   args = {content: "string", renderContext: renderContext}
*/
var blockMangler = undefined;

exports.info = {
  __output_stack: [],
  block_stack: [],
  file_stack: [],
  args: []
};

function getCurrentFile() {
  return exports.info.file_stack[exports.info.file_stack.length-1];
}

function createBlockId(name) {
  return getCurrentFile().path + '|' + name;
}

exports._init = function (b, recursive) {
  exports.info.__output_stack.push(exports.info.__output);
  exports.info.__output = b;
}

exports._exit = function (b, recursive) {
  getCurrentFile().inherit.forEach(function (item) {
    exports._require(item.name, item.args);
  });
  exports.info.__output = exports.info.__output_stack.pop();
}

exports.begin_capture = function() {
  exports.info.__output_stack.push(exports.info.__output.concat());
  exports.info.__output.splice(0, exports.info.__output.length);
}

exports.end_capture = function () {
  var res = exports.info.__output.join("");
  exports.info.__output.splice.apply(
    exports.info.__output,
    [0, exports.info.__output.length].concat(exports.info.__output_stack.pop()));
  return res;
}

exports.begin_define_block = function (name) {
  exports.info.block_stack.push(name);
  exports.begin_capture();
}

exports.end_define_block = function () {
  var content = exports.end_capture();
  return content;
}

exports.end_block = function () {
  var name = exports.info.block_stack.pop();
  var renderContext = exports.info.args[exports.info.args.length-1];
  var args = {content: exports.end_define_block(), renderContext: renderContext};
  if (blockMangler) blockMangler(name, args);
  exports.info.__output.push(args.content);
}

exports.begin_block = exports.begin_define_block;

exports.inherit = function (name, args) {
  getCurrentFile().inherit.push({name:name, args:args});
}

exports.require = function (name, args, mod) {
  if (args == undefined) args = {};

  var basedir = __dirname;
  var paths = [];

  if (exports.info.file_stack.length) {
    basedir = path.dirname(getCurrentFile().path);
  }
  if (mod) {
    basedir = path.dirname(mod.filename);
    paths = mod.paths;
  }

  var ejspath = resolve.sync(
    name,
    {
      paths : paths,
      basedir : basedir,
      extensions : [ '.html', '.ejs' ],
    }
  )

  var template = '<% e._init(__output); %>' + fs.readFileSync(ejspath).toString() + '<% e._exit(); %>';
  
  /* Inherit args from parent file */
  var merged_args = {};
  merged_args.e = exports;
  merged_args.require = require;
  if (exports.info.args.length > 0) {
    var last_args = exports.info.args[exports.info.args.length-1];
    for (var key in last_args) {
      merged_args[key] = last_args[key];
    }
  }
  for (var key in args) {
    merged_args[key] = args[key];
  }

  exports.info.args.push(merged_args);
  exports.info.file_stack.push({path: ejspath, inherit: []});

  var res = ejs.render(template, merged_args);

  exports.info.file_stack.pop();
  exports.info.args.pop();

  return res;
}

exports._require = function (name, args) {
  exports.info.__output.push(exports.require(name, args));
}
