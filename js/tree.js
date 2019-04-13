(function ($, Drupal, drupalSettings) {
  'use strict';

  /**
   * Attaches the JS.
   */
  Drupal.behaviors.TermReferenceFancyTree = {
    attach: function (context, settings) {
      // Loop through each fancytree (each field) in our settings.
      for (let key in settings.term_reference_fancytree) {
        // Get the settings the tree.
        let treeSettings = settings.term_reference_fancytree[key].tree || [];
        if (treeSettings instanceof Array) {
          for (let i = 0; i < treeSettings.length; i++) {
            // Initialise a new Fancytree with our settings.
            $('#' + treeSettings[i].id).once('term-reference-fancytree').each(function () {
              new Drupal.TermReferenceFancyTree(treeSettings[i].id, treeSettings[i].name, treeSettings[i].source, treeSettings[i].default_values , treeSettings[i].expanded);
            });
          }
        }
      }
    }
  };

  /**
   * FancyTree integration.
   *
   * @param {string} id The id of the wrapping div element
   * @param {string} name The form element name (used in $_POST)
   * @param {object} source The JSON object representing the initial tree
   * @param {array} default_values A list of default values saved in the
   *     database.
   * @param {array} expanded A list of nodes to auto-expand.
   */
  Drupal.TermReferenceFancyTree = function (id, name, source, default_values, expanded) {
    // Settings generated by http://wwwendt.de/tech/fancytree/demo/sample-configurator.html
    $('#' + id).fancytree({
      activeVisible: true, // Make sure, active nodes are visible (expanded).
      aria: true, // Enable WAI-ARIA support.
      autoActivate: true, // Automatically activate a node when it is focused (using keys).
      autoCollapse: false, // Automatically collapse all siblings, when a node is expanded.
      autoScroll: true, // Automatically scroll nodes into visible area.
      clickFolderMode: 4, // 1:activate, 2:expand, 3:activate and expand, 4:activate (dblclick expands)
      checkbox: true, // Show checkboxes.
      debugLevel: 2, // 0:quiet, 1:normal, 2:debug
      disabled: false, // Disable control
      focusOnSelect: false, // Set focus when node is checked by a mouse click
      generateIds: false, // Generate id attributes like <span id='fancytree-id-KEY'>
      idPrefix: 'ft_', // Used to generate node id´s like <span id='fancytree-id-<key>'>.
      icon: true, // Display node icons.
      keyboard: true, // Support keyboard navigation.
      keyPathSeparator: '/', // Used by node.getKeyPath() and tree.loadKeyPath().
      minExpandLevel: 1, // 1: root node is not collapsible
      quicksearch: true, // Navigate to next node by typing the first letters.
      selectMode: 2, // 1:single, 2:multi, 3:multi-hier
      tabindex: 0, // Whole tree behaves as one single control
      titlesTabbable: true, // Node titles can receive keyboard focus
      lazyLoad: function (event, data) {
        // Load child nodes via ajax GET /term_reference_fancytree/parent=1234&vocab=true
        data.result = {
          url: Drupal.url('term_reference_fancytree/subTree'),
          data: {parent: data.node.key, vocab: data.node.data.vocab},
          cache: false
        };
      },
      // Postprocess data to select values.
      postProcess: function(event, data) {
        // Loop through the default values list and select each on our tree.
        for (let index = 0; index < default_values.length; index++) {
          // Find default values in the current tree and select them.
          data.response.find((o, i) => {
              if (o.key === default_values[index]['target_id']) {
                data.response[i]['selected'] = true;
                  return true; // stop searching
              }
          });
        }
      },
      source: source,
      select: function (event, data) {
        // We update the the form inputs on every checkbox state change as
        // ajax events might require the latest state.
        data.tree.generateFormElements(name + '[]');
      },
      // Change status in bulk for child nodes.
      dblclick: function (event, data) {
        // Get the selection status
        let status = !data.node.selected;
        // Set the parent status.
        data.node.setSelected(status);
        // Go through every child and change the status of the parent.
        data.node.visit(function(node) {
          node.setSelected(status);
        });
      }
    });

    // Loop through the expanded nodes list and expand each one in the tree.
    let tree = expandNodes(Object.values(expanded));
    // Update the inputs after all expanded items.
    tree.generateFormElements(name + '[]');

    // Function to expand nodes.
    function expandNodes(nodesToExpand) {

      // First we get the newest tree from the markup.
      let tree = $('#' + id).fancytree("getTree");

      // We continue expanding nodes if there are still some in the list.
      if(nodesToExpand.length > 0){

        // Get the term id of the first node to expand.
        let parents = nodesToExpand[0]['parents'];

        // Loop through the parents.
        for(let index=0; index < parents.length; index++){
          let parent = parents[index]['target_id'];
          let node = null;

          // If the parent is a root node, we expand the vocabulary.
          if(parent === "0"){
            // Get the node from the tree that corresponds to the vocab id.
            node = tree.getNodeByKey(nodesToExpand[0]['vid']);
          }
          else {
            // Get the node from the tree that corresponds to the term id.
            node = tree.getNodeByKey(parent);
          }

          // If we find the node, it means it belongs on the current open
          // levels.
          if(node){
            // Expand the node and call the function again recursively.
            node.setExpanded(true).then(function (value) {
               tree = $('#' + id).fancytree("getTree");
               nodesToExpand.shift();
               expandNodes(nodesToExpand)
             });
          }
          // If the node can't be found, discard it and call the function again.
          else{
            nodesToExpand.shift();
            expandNodes(nodesToExpand)
          }
        }
      }

      // Return the final tree with all terms expanded.
      return tree;
    }
  };

})(jQuery, Drupal, drupalSettings);