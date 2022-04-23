import axios from 'axios'

const webhook = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=5a00e430-aefe-4d8e-991d-549f60777ba6"

export default {
    markdown: function(markdown) {
        axios.post(webhook, {
            "msgtype": "markdown",
            "markdown": {
                "content": markdown
            }
        })
    },

    text: function(text) {
        axios.post(webhook, {
            "msgtype": "text",
            "text": {
                "content": text
            }
        })
    }
}
