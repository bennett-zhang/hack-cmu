$(() => {
	const socket = io();
	const $users = $("#users");
	const $story = $("#story");
	const $form = $("#form");
	const $snippetInput = $("#snippet-input");
	const $snippetButton = $("#snippet-button")
  const $errors = $('#errors');

	function updateUsers(room) {
		$users.empty();

		for (let i = 0; i < room.users.length; i++) {
			const user = room.users[i];
			$users.append(`
			<li class="list-group-item" style="color: ${user.color}">
				<span class="badge badge-pill badge-secondary"> ${i + 1} </span> ${user.name}
			</li>`);
		}

		if (room.usersNeeded > 0) {
			$users.append(`<li class="list-group-item">${room.usersNeeded} users needed</li>`);
		} else {
			//$snippetInput.removeAttr("disabled");
			//$snippetButton.removeAttr("disabled");
		}
	}


	//A player will receive "start_turn" when it reaches their turn
	socket.on("start_turn", function () {
		//Add big textbox or pop-up saying "IT'S YOUR TURN!"
		//Include visual timer display to count down time left
		console.log("Your turn!")

		$snippetInput.removeAttr("disabled");
		$snippetButton.removeAttr("disabled");
	});

	//A player will receive "end_turn" once they've entered a snippet or time runs out
	socket.on("end_turn", function() {
		console.log("Your turn is over.")

		$snippetInput.attr("disabled", true);
		$snippetButton.attr("disabled", true);
	});


	socket.on("join", room => {
		updateUsers(room);
	});

	socket.on("leave", room => {
		updateUsers(room);
	});

	$form.submit(() => {
		socket.emit("snippet", $snippetInput.val().trim(), function (msg) {
      console.log('ready to display message');
      $errors.val(msg);
    });
		$snippetInput.val("");
		return false;
	});

	socket.on("snippet", (snippet, color) => {
		$story.append(`<span style="color: ${color}"> ${snippet}</span>`);
  });
});
