const express = require('express')
const router = express.Router()
const adminController = require('../../../controllers/apis/admin-controller')
const upload = require('../../../middleware/multer')
const categoryController = require('../../../controllers/apis/category-controller')

router.get('/restaurants', adminController.getRestaurants)

module.exports = router
