/*
 * jQtemplate jQuery plugin
 *
 * Copyright (c) 2009 Josh Kropf
 *
 * Licensed under the GPL license:
 *   http://www.gnu.org/licenses/gpl.html
 *
 */

(function($) {

   /**
    * Evaluate template.
    *
    * A template is comprised of regular HTML (usually hidden) with special
    * attributes that are evaluated to produce some dynamic content in the
    * DOM.
    *
    * The attributes are evaluated as JSON (JavaScript object notation).  An
    * object model is used to provide the context of the attribute evaluation
    * and exposed as an object named '$this'.
    *
    * @attr jqtext
    *    The attribute is evaluated and the result is inserted as the contents
    *    of the DOM element.
    *
    * @attr jqattr
    *    Map of key/value pairs used to set attributes of the DOM element.
    *
    * @attr jqbind
    *    Array of objects with properties for building event bindings to the
    *    DOM element. The following properties are used.
    *       event: name of the event to bind to
    *       fn: event handler function
    *       args: optional, single arg or array of args passed to event handler
    *
    * @attr jqloop
    *    Object with properties for building a loop.  For each iteration of the
    *    loop the DOM element is cloned and appended to it's parent element.
    *    The following properties are used.
    *       array: the array to iterate over
    *       object: name of variable in context object to hold current value
    *
    * @param Object model
    *    An object to use as the context of the template evaluation.
    *
    * @param Options options
    *    A set of key/value pairs that configure template processing.
    *    All options are optional.
    *
    * @option Boolean inplace
    *    If true, evaluate the template in place instead of cloning the
    *    template and appending to root.  Default is false.
    *
    * @option String,jQuery root
    *    The root node to append the template evaluation.
    *    Use a string to specify a selector expression or a jQuery object.
    *    Defaults to the <body> node.
    */
   $.fn.jqtemplate = function(model, options) {
      var opts = $.extend({}, $.fn.jqtemplate.defaults, options),
          templatePath = this.selector + "/";
      
      if (this.data("compiled") != true) {
         compileTemplate(this, this.selector);
         this.data("compiled", true);
      }
      
      if (opts.inplace) {
         return this.each(function(i, node) {
            evalNode(model, node, templatePath + node.get(0).nodeName);
         });
      } else {
         // when root option is a string use it as a selector, otherwise
         // assume it is already a jquery object for the root node
         var root = typeof(opts.root) == "string"? $(opts.root) : opts.root;
         
         return this.each(function(i, node) {
            var copy = $(node).clone();
            root.append(copy);
            evalNode(model, copy, templatePath + node.nodeName);
         });
      }
   };
   
   $.fn.jqtemplate.defaults = {
      inplace: false,
      root: "body"
   };
   
   /**
    * Map of attribute functions.  Keys of the map are path representations
    * of the template node that contains jqtemplate attributes.  The value for
    * a given key is the compiled function.
    */
   var attrCallback = {};
   
   /**
    * Recursively create function objects for jqtemplate attributes.
    * @param node current template node
    * @param path path representation of template node
    */
   function compileTemplate(node, path) {
      path = path + "/" + node.get(0).nodeName;
      
      var names = ["jqloop", "jqbind", "jqattr", "jqtext"];
      for (var i in names) {
         if (node.attr(names[i])) {
            var f = new Function(["$this"], "return " + node.attr(names[i]));
            attrCallback[path + "/" + names[i]] = f;
         }
      }
      
      node.children().each(function(i, node) {
         compileTemplate($(node), path);
      });
   }
   
   /**
    * Recursively evaluate nodes of the template and their children.
    * @param $this object model/context of template evaluation
    * @param node current template node
    * @param path path representation of template node
    */
   function evalNode($this, node, path) {
      if (node.attr("jqloop")) {
         var op = attrCallback[path + "/jqloop"]($this),
             first = node,
             last = node;
         
         // remove jqloop attribute to avoid infinate recursion
         node.removeAttr("jqloop");
         
         // iterate over objects in the loop array and create/add
         // new nodes in the dom
         for (var i in op.array) {
            // place the current array element in the template context
            $this[op.object] = op.array[i];
            
            // clone the first node (the template node) and
            // add it after the last node
            var copy = $(first.clone());
            last.after(copy);
            last = copy;
            
            // evaluate the cloned node
            evalNode($this, copy, path);
         }
         
         first.remove();
         return;
      }
      
      if (node.attr("jqbind")) {
         var bindings = $.makeArray(attrCallback[path + "/jqbind"]($this));
         
         for (var i in bindings) {
            node.bind(bindings[i].event, bindings[i], function(event) {
               // apply will call the function with a given 'this' object
               // and an array of function parameters
               // ... in the current context, 'this' is the dom element
               // that the event is bound to
               var binding = event.data;
               binding.fn.apply(this, $.makeArray(binding.args));
            });
         }
      }
      
      if (node.attr("jqattr")) {
         var attrs = attrCallback[path + "/jqattr"]($this);
         for (var key in attrs) {
            node.attr(key, attrs[key]);
         }
      }
      
      if (node.attr("jqtext")) {
         var text = attrCallback[path + "/jqtext"]($this);
         node.text(text);
      }
      
      node.children().each(function(i, node) {
         evalNode($this, $(node), path + "/" + node.nodeName);
      });
   }

})(jQuery);
