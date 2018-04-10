function requestErrorHandler (err, req, res) {
  // set locals, only providing error in development
  // const isDev = req.app.get('env') === 'development'
  // res.locals.message = err.message
  // res.locals.error = isDev ? err : {}
  const error = {
    status: err.status || 500,
    type: err.type || 'INTERNAL_ERROR',
    data: err.data,
    stackTrace: err.stack
  }

  const response = res.status(error.status)
  response.send(error)

  // TODO: Add template engine and uncomment
  // const contentType = req.headers['content-type']
  // if (contentType && contentType.indexOf('application/json') !== -1) {
  //   response.send(toErrorDto(isDev, err))
  // } else {
  //   response.render('error')
  // }
}

module.exports = {
  requestErrorHandler
}
