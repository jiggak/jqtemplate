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
      var opts = $.extend({}, $.fn.jqtemplate.defaults, options);
      
      if (opts.inplace) {
         return this.each(function(i, node) {
            evalNode(node);
         });
      } else {
         // when root option is a string use it as a selector, otherwise
         // assume it is already a jquery object for the root node
         var root = typeof(opts.root) == "string"? $(opts.root) : opts.root;
         
         return this.each(function(i, node) {
            var copy = $(node).clone();
            root.append(copy);
            evalNode(copy, model);
         });
      }
   };
   
   $.fn.jqtemplate.defaults = {
      inplace: false,
      root: "body"
   };
   
   // Evaluate the contents of the named attribute of the given node and
   // return the result.  The '$this' parameter is included so that the
   // expression in the attribute can reference the context of the template.
   function evalAndRemoveAttr(node, attrName, $this) {
      // wrap expression in parenthesis to avoid 'invalid label' error
      var result = eval("(" + node.attr(attrName) + ")");
      node.removeAttr(attrName);
      return result;
   }
   
   // Recursively evaluate nodes of the template and their children.
   function evalNode(node, $this) {
      while (true) {
         if (node.attr("jqloop")) {
            var op = evalAndRemoveAttr(node, "jqloop", $this);
            
            var first = node;
            var last = node;
            
            // iterate over objects in the loop array and create/add
            // new nodes in the dom
            $.each(op.array, function(i, obj) {
               // place the current array element in the template context
               $this[op.object] = obj;
               
               // clone the first node (the template node) and
               // add it after the last node
               var copy = $(first.clone());
               last.after(copy);
               last = copy;
               
               // evaluate the cloned node
               evalNode(copy, $this);
            });
            
            first.remove();
            return;
         } else if (node.attr("jqbind")) {
            var bindings = evalAndRemoveAttr(node, "jqbind", $this);
            $.each($.makeArray(bindings), function(i, binding) {
               node.bind(binding.event, function() {
                  // apply will call the function with a given 'this' object
                  // and an array of function parameters
                  // ... in the current context, 'this' is the dom element
                  // that the event is bound to
                  binding.fn.apply(this, $.makeArray(binding.args));
               });
            });
         } else if (node.attr("jqattr")) {
            var attrs = evalAndRemoveAttr(node, "jqattr", $this);
            $.each(attrs, function(key, val) { node.attr(key, val); });
         } else if (node.attr("jqtext")) {
            var text = evalAndRemoveAttr(node, "jqtext", $this);
            node.text(text);
         } else {
            break;
         }
      }
      
      node.children().each(function(i, node) {
         evalNode($(node), $this);
      });
   }

})(jQuery);
