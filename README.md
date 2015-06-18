# eejs
Extensible Embedded Javascript is a template inheritance system for the [EJS templating language](http://www.embeddedjs.com/). It provides blocks and template inheritance similar to what's available in Django templates.

EEJS supports all EJS syntax, and adds syntax for template inheritance and for defining nested overrideable blocks.

Basic example:

    var rendered_text = require("eejs").require("./examples/foo.ejs")

examples/foo.ejs:

    <% e.inherit("./bar.ejs"); %>

    <% e.begin_define_block("foo"); %>
      YY
      <% e.super(); %>
      ZZ
    <% e.end_define_block(); %>

examples/bar.ejs:

    a
    <% e.begin_block("bar"); %>
      A
      <% e.begin_block("foo"); %>
      XX
      <% e.end_block(); %>
      B
    <% e.end_block(); %>
    b

Output:

    a
      A
      YY
      XX
      ZZ
      B
    b
