Future = Npm.require('fibers/future');

var saveBasePath = '/Users/nathanwallis/Desktop/temp/mation/';

function getMationIdPath(mationId, splitAmount = 6){
  splitAmount = Math.min(mationId.length, splitAmount);
  return saveBasePath + mationId.split('').slice(0,splitAmount).join('/') + "/" + mationId + "/";
}

Meteor.startup(function () {
  // code to run on server at startup
});

Meteor.methods({

  uploadFile: function (file, mationID) {
    var fut = new Future();
    file.save(getMationIdPath(mationID), {}, function(err){
      if (err){
        fut.throw(err);
      }else{
        fut.return(file.frameNumber);
      }
    });
    return fut.wait();
  },

  encodeVideo: function(frameRate, mationID){
    var exec = Npm.require('child_process').exec;
    var fut = new Future();
    var command = "ffmpeg -r " + frameRate + "  -i " + getMationIdPath(mationID) + "image-%0" + MationFile.NUMBER_OF_ZEROS_FOR_PADDING + "d.jpg -y " + getMationIdPath(mationID) + "video." + MationFile.VIDEO_OUTPUT_EXTENSION;
    exec (command, function(error, stdout, stderr){
      if (error) {
        fut.throw(error);
      }else{
        fut.return(true);
      }
    });

    return fut.wait();
  },

  publishVideo: function(name, description, mationID){
    //log job with kue here
    //return to user   
    var fut = new Future();
    var key = Npm.require('/Users/nathanwallis/Downloads/client_secret_1015934107435-nqbrhbe5eqlvqtdjqj5l3524r37jbrqk.apps.googleusercontent.com.json');
    var tokens = Npm.require('/Users/nathanwallis/Desktop/temp/mation/tokens.json');
    var Google = Npm.require('googleapis');
    var Youtube = Google.youtube("v3");
    var Fs = Npm.require('fs');
    var oauth = new Google.auth.OAuth2(key.installed.client_id, key.installed.client_secret, 'http://localhost:5000/oauth2callback');
    oauth.setCredentials(tokens);

    Google.options({auth:oauth});

    if (name == '') name = 'mation.me video';
    if (description == '') description = 'Visit mation.me to create your own video and animated GIF';

    Youtube.videos.insert({
      resource: {
        snippet: {
          title:name 
      , description:description 
        }
      , status: {
    privacyStatus: "private"
      }
      }
      , part: "snippet,status"

      , media: {
    body: Fs.createReadStream(getMationIdPath(mationID) + "video.mp4")
      }
    }, Meteor.bindEnvironment(function (err, data) {
      if(err) {
        fut.throw(err);
      }else{
        Mations.insert({name:name, description:description, youtube_id:data.id});
        fut.return(data); 
      }
    }));

    return fut.wait();
  }

});
