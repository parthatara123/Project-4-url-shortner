const mongoose = require('mongoose')

const urlSchema = mongoose.Schema({
     urlCode: { 
        type: String,
        required: [true, "urlCode is required"],
         unique: true,
        lowercase: true,
        trim: true
     }, 
     longUrl: {
         type: String,
         required: [true, "Long url must be provided"],
         trim: true
    }, 
    shortUrl: {
        type: String,
        required: [true, "Short url is required"],
        unique: true,
        trim: true
    } 
}, {timestamps: true}
)

module.exports = mongoose.model('URL', urlSchema)
