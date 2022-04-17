const express = require("express");
const router = express.Router();
const UrlController = require('../controller/urlController')


router.get('/test', async function(req, res){
    res.status(200).send("Test API")
})

router.post('/url/shorten', UrlController.createShortUrl)
router.get('/:urlCode', UrlController.getOriginalUrl)


module.exports = router