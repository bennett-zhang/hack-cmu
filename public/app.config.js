angular.
  module('pineapple-express').
  config(['$locationProvider', '$routeProvider',
    function config($locationProvider, $routeProvider) {
      $locationProvider.hashPrefix('!');

      $routeProvider.
      when('/home', {
          template: '<story-list></story-list>'
        }).
        when('/add', {
          template: '<story-form></story-form>'
        }).
        when('/stories/:story_id', {
          template: '<story-detail></story-detail>'
        }).
        otherwise('/home');
        
    }
  ]);