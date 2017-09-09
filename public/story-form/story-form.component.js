angular.
module('storyForm').
component('storyForm', {
    templateUrl: 'story-form/story-form.template.html',
    controller: ['$scope', '$http', function StoryFormController($scope, $http) {

        $scope.formData = {};

        // on form submit, send data to server
        $scope.createStory = function() {

            $scope.formData.title = getTitle($scope.formData.text);
            $scope.formData.datetime = new Date();
            $scope.formData.wordcount = getWordCount($scope.formData.text);
            
            // these values 0 for now
            $scope.formData.upvotes = 0;
            $scope.formData.downvotes = 0;
            $scope.formData.netvotes = 0;

            $http.post('/api/stories', $scope.formData)
            .then(
                function(response) {
                    // clear form for next submission
                    $scope.formData = {};

                    alert(response.data);

                    console.log(response);
                },
                function(response) {
                    console.log(response);
                }
            );
        }


        function getWordCount(storyText) {

            return storyText.split(" ").length;
            // var wordcount = 0;
            // for(var i = 0; i < text.length; i++) {
            //     if(text.substring(i, i+1).equals(" ")) {
            //         wordcount++;
            //     }
            // }
            // return wordcount;
        }

        function getTitle(storyText) {
            var wordList = storyText.split(" ");
            if(wordList.length <= 5) {
                return storyText;
            }
            var title = "";
            for(var i = 0; i < 5; i++) {
                title += wordList[i] + " ";
            }
            return title.substring(0, title.length - 1);
        }

    }]
})