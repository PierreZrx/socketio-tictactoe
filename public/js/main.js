const socket = io('http://192.168.1.16:3000');
let clicked = false;

document.querySelector('.newPlayer__button').onclick = () => {
  if (clicked === false) {
    let name = document.querySelector('.newPlayer__input').value;
    socket.emit('newPlayer', name);
    document.querySelector('.newPlayer__container').style.visibility = 'hidden';
    document.querySelector('.newPlayer__container').style.opacity = '0';

    setTimeout(function() {
      document.querySelector('.newPlayer__container').style.display = 'none';
      messages.style.visibility = 'visible';
      messages.style.opacity = '1';
      document.querySelector('.room__container').style.visibility = 'visible';
      document.querySelector('.room__container').style.opacity = '1';
      document.querySelector('.status__container').style.visibility = 'visible';
      document.querySelector('.status__container').style.opacity = '1';
    }, 300)
  }
  clicked = true;
}

socket.on('button', (res) => {
  document.querySelector('.reset-button').style.display = 'block';
});

document.querySelector('.reset-button').onclick = () => {
  window.location.reload();
};


const messages = document.querySelector('.messages__container');
socket.on('message', function(res) {
  const messageContainerDiv = document.createElement('div');
  messageContainerDiv.className = 'messages__message';

  const messageTextSpan = document.createElement('span');
  messageTextSpan.className = 'messages__text';
  const messageText = document.createTextNode(res);
  messageTextSpan.appendChild(messageText);

  const timeNow = new Date();
  const hours   = timeNow.getHours();
  const minutes = timeNow.getMinutes();
  const seconds = timeNow.getSeconds();
  let timeString = "" + hours;
  timeString  += ((minutes < 10) ? ":0" : ":") + minutes;
  timeString  += ((seconds < 10) ? ":0" : ":") + seconds;

  const messageTimeSpan = document.createElement('span');
  messageTimeSpan.className = 'messages__time';
  const messageTime = document.createTextNode(' [' + timeString + '] ');
  messageTimeSpan.appendChild(messageTime);

  messageContainerDiv.appendChild(messageTimeSpan);
  messageContainerDiv.appendChild(messageTextSpan);
  messages.appendChild(messageContainerDiv);
});

socket.on('status', (res) => {
  document.querySelector('.status__container').innerHTML = res;
})

socket.on('draw', (res) => {
  const square = document.querySelector('[x="'+ res.cords.x +'"][y="'+ res.cords.y +'"]');
  square.style.background = res.type === 'x' ? 'green' : 'red';
});

document.querySelector('.board__container').addEventListener('click', (e) => {
  const x = e.target.getAttribute('x');
  const y = e.target.getAttribute('y');
  socket.emit('tick', {x: x, y: y});
}, false);
