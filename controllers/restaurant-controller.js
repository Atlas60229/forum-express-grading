const express = require('express')
const router = express.Router()

const restaurantController ={
    getRestaurant: (req,res) =>{
        return res.render('restaurants')
    }
}

module.exports = restaurantController