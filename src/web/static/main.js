(function () {
  var versionContainer = document.getElementById('versionContainer')
  var xhr = new XMLHttpRequest()
  xhr.open('GET', 'api/version')
  xhr.onload = function () {
    if (xhr.status === 200) {
      versionContainer.innerHTML = '- &nbsp;v' + xhr.responseText
    } else {
      console.error('ERROR getting the version: ' + xhr.status)
    }
  }
  xhr.send()
})()
