angular.
  module('storyList').
  component('storyList', {
    templateUrl: 'story-list/story-list.template.html',
    controller: ['$scope', '$http', function StoryListController($scope, $http) {
      
        // when landing on the page, get all stories and show them
        $http.get('/api/stories')
        .success(function(data) {
            $scope.stories = data;
            console.log(data);
        })
        .error(function(data) {
            console.log('Error: ' + data);
        });


        // delete a story
        $scope.deleteStory = function(id) {

        $http.delete('/api/stories/' + id)
            .success(function(data) {
                $scope.stories = data;
                console.log(data);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
        };

        $scope.getShortText = function(storyText) {
            var wordList = storyText.split(" ");
            if(wordList.length <= 50) {
                return storyText;
            }

            var shortText = "";

            for(var i = 0; i < 50; i++) {
                shortText += wordList[i] + " ";
            }
            return shortText.substring(0, shortText.length - 1) + "...";
        }
      
    }]
  });



