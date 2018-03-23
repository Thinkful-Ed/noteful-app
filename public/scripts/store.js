// eslint-disable-next-line no-unused-vars
'use strict';

const store = (function () {

  return {
    notes: [],
    folders: [],
    tags: [],

    currentNote: {},
    currentQuery: {
      searchTerm: '',
    },
    authToken: ''
  };

}());
