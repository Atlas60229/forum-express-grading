module.exports = {
  generalErrorHandler (err, req, res, next) {
    if (err instanceof Error) {
      req.flash('error_message', `${err.name}: ${err.message}`)
    } else {
      req.flash('error_message', `${err}`)
    }
    res.redirect('back')
    next(err)
  }
}
