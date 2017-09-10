angular.
module('storyDetail').
component('storyDetail', {
	templateUrl: 'story-detail/story-detail.template.html',
	controller: ['$scope', '$http', '$routeParams', function StoryDetailController($scope, $http, $routeParams) {

		// when landing on the page, get one story and display it
		$http.get('/api/stories/' + $routeParams.story_id)
		.success(function(data) {
			$scope.story = data;
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
                alert("story deleted");
                console.log(data);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
        };


        $scope.getDateString = function(dateObj) {
           
            return dateObj.substring(0, 10) + " " + 
            dateObj.substring(11, 19);
                
        }



	}]
});