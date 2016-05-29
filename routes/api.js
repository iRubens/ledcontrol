var express = require('express');
var router = express.Router();

/* GET home page. */
router.route('/drawer/color').post(function(req, res) {
  var tmp = req.app.get('ledControl');
  tmp.fillColor(req.body.r, req.body.g, req.body.b);
  
  res.send('');
});

router.route('/drawer/random').get(function(req, res) {
  var tmp = req.app.get('ledControl');
  tmp.drawRandom();
  
  res.send('');
});

router.route('/drawer/rainbow').get(function(req, res) {
  var tmp = req.app.get('ledControl');
  tmp.fillRainbow();
  
  res.send('');
});

router.route('/drawer/animate').post(function(req, res) {
  var tmp = req.app.get('ledControl');
 
  var tmpAnimResult = tmp.animate(req.body.anim_name, (req.body.fps ? parseFloat(req.body.fps) : 60));
  
  res.send({
    a : tmpAnimResult
  });
});

router.route('/drawer/fps').post(function(req, res) {
  var tmp = req.app.get('ledControl');
  tmp.updateFps(req.body.fps ? parseFloat(req.body.fps) : 60);
  
  res.send('');
});

router.route('/drawer/reset').get(function(req, res) {
  var tmp = req.app.get('ledControl');
  tmp.reset();
  
  res.send('');
});

module.exports = router;
