/* global $ noteful api store */
"use strict";

$(document).ready(function () {
  noteful.bindEventListeners();

  Promise.all([
    api.search("/api/notes"),
    api.search("/api/folders"),
    api.search("/api/tags")
  ])
    .then(([
      notes,
      folders,
      tags
    ]) => {
      store.notes = notes;
      store.folders = folders;
      store.tags = tags;
      noteful.render();
    });

});
