$(() => {
	const socket = io();
	const $users = $("#users");
	const $story = $("#story");
	const $form = $("#form");
	const $snippetInput = $("#snippet-input");
	const $snippetButton = $("#snippet-button");

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
			$snippetInput.removeAttr("disabled");
			$snippetButton.removeAttr("disabled");
		}
	}

	socket.on("join", room => {
		updateUsers(room);
	});

	socket.on("leave", room => {
		updateUsers(room);
	});

	$form.submit(() => {
		socket.emit("snippet", $snippetInput.val().trim());
		$snippetInput.val("");
		return false;
	});

	socket.on("snippet", (snippet, color) => {
                validTurn = true;
                storyComplete = false;
                if (validTurn && !storyComplete) {
		        $story.append(`<span style="color: ${color}"> ${snippet}</span>`);
                }
	});

        socket.on("vote to archive",
});
