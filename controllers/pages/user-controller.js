const { User, Comment, Restaurant, Favorite, Like, Followship } = require('../../models')
const bcrypt = require('bcryptjs')
const { imgurFileHandler } = require('../../helpers/file-helpers')

const userController = {
  getUser: (req, res, next) => {
    return Promise.all([
      User.findByPk(req.params.id, {
        include: [
          { model: Restaurant, as: 'FavoritedRestaurants' },
          { model: Restaurant, as: 'LikedRestaurants' },
          { model: User, as: 'Followers' },
          { model: User, as: 'Followings' }
        ]
      }),
      Comment.findAndCountAll({ where: { userId: req.params.id }, include: [{ model: Restaurant }] })
    ]).then(([user, comments]) => {
      if (!user) throw new Error("User didn't exist")

      const uniqueRestaurants = new Set()
      const commentedRests = []

      comments.rows.forEach(comment => {
        const restaurant = comment.Restaurant
        if (!uniqueRestaurants.has(restaurant.id)) {
          uniqueRestaurants.add(restaurant.id)
          commentedRests.push(restaurant.dataValues)
        }
      })

      const commentCount = commentedRests.length

      res.render('users/profile', { user: user.toJSON(), commentedRests, commentCount })
    })
      .catch(err => next(err))
  },
  editUser: (req, res, next) => {
    // if (req.user.id !== Number(req.params.id)) {
    //   req.flash('error_messages', '不得編輯他人資料')
    //   return res.redirect(`/users/${req.user.id}/edit`)
    // }
    return User.findByPk(req.params.id, {
      raw: true
    })
      .then(user => {
        if (!user) throw new Error("User didn't exist")
        res.render('users/edit', { user })
      })
      .catch(err => next(err))
  },
  putUser: (req, res, next) => {
    const { name } = req.body
    if (!name) throw new Error('User name is required!')
    const file = req.file
    return Promise.all([User.findByPk(req.user.id), imgurFileHandler(file)])
      .then(([user, filePath]) => {
        if (!user) throw new Error("User didn't exist!")
        return user.update({
          name,
          image: filePath || user.image
        })
      })
      .then(() => {
        req.flash('success_messages', '使用者資料編輯成功')
        res.redirect(`/users/${req.user.id}`)
      })
      .catch(err => next(err))
  },
  signUpPage: (req, res, next) => {
    res.render('signup')
  },
  signUp: (req, res, next) => {
    if (req.body.password !== req.body.passwordCheck) throw new Error('Passwords do not match!')
    User.findOne({ where: { email: req.body.email } })
      .then(user => {
        if (user) throw new Error('Email already exists!')
        return bcrypt.hash(req.body.password, 10)
      })
      .then(hash => User.create({
        name: req.body.name,
        email: req.body.email,
        password: hash
      }))
      .then(() => {
        req.flash('success_messages', '成功註冊帳號！')
        res.redirect('/signin')
      })
      .catch(err => next(err))
  },
  signInPage: (req, res) => {
    res.render('signin')
  },
  signIn: (req, res) => {
    req.flash('success_messages', '成功登入！')
    res.redirect('/restaurants')
  },
  logout: (req, res, next) => {
    req.logout(err => {
      if (err) { return next(err) }
      req.flash('success_messages', '登出成功！')
      res.redirect('/signin')
    })
  },
  addFavorite: (req, res, next) => {
    const { restaurantId } = req.params
    return Promise.all([
      Restaurant.findByPk(restaurantId),
      Favorite.findOne({
        where: {
          userId: req.user.id,
          restaurantId
        }
      })
    ])
      .then(([restaurant, favorite]) => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        if (favorite) throw new Error('You have favorited this restaurant!')
        return Favorite.create({
          userId: req.user.id,
          restaurantId
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeFavorite: (req, res, next) => {
    return Favorite.findOne({
      where: {
        userId: req.user.id,
        restaurantId: req.params.restaurantId
      }
    })
      .then(favorite => {
        if (!favorite) throw new Error("You haven't favorited this restaurant")

        return favorite.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  addLike: (req, res, next) => {
    const { restaurantId } = req.params
    return Promise.all([
      Restaurant.findByPk(restaurantId),
      Like.findOne({
        where: {
          userId: req.user.id,
          restaurantId
        }
      })
    ])
      .then(([restaurant, like]) => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        if (like) throw new Error('You have liked this restaurant!')

        return Like.create({
          userId: req.user.id,
          restaurantId
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeLike: (req, res, next) => {
    return Like.findOne({
      where: {
        userId: req.user.id,
        restaurantId: req.params.restaurantId
      }
    })
      .then(like => {
        if (!like) throw new Error("You haven't liked this restaurant")

        return like.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  getTopUsers: (req, res, next) => {
    return User.findAll({
      include: [{ model: User, as: 'Followers' }]
    })
      .then(users => {
        users = users.map(user => ({
          ...user.toJSON(),
          followerCount: user.Followers.length,
          // 判斷目前登入使用者是否已追蹤該 user 物件
          isFollowed: req.user.Followings.some(following => following.id === user.id)
        }))
        users = users.sort((a, b) => b.followerCount - a.followerCount)
        res.render('top-users', { users: users })
      })
      .catch(err => next(err))
  },
  addFollowing: (req, res, next) => {
    const { userId } = req.params
    Promise.all([
      User.findByPk(userId),
      Followship.findOne({
        where: {
          followerId: req.user.id,
          followingId: req.params.userId
        }
      })
    ])
      .then(([user, followship]) => {
        if (!user) throw new Error("User didn't exist!")
        if (followship) throw new Error('You are already following this user!')
        return Followship.create({
          followerId: req.user.id,
          followingId: userId
        })
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  },
  removeFollowing: (req, res, next) => {
    Followship.findOne({
      where: {
        followerId: req.user.id,
        followingId: req.params.userId
      }
    })
      .then(followship => {
        if (!followship) throw new Error("You haven't followed this user!")
        return followship.destroy()
      })
      .then(() => res.redirect('back'))
      .catch(err => next(err))
  }

}

module.exports = userController
