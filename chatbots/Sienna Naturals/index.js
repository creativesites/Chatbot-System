// index.js (for cloud function)
const { fulfillmentHandler } = require('myavana-sienna-naturals-bot-test');

exports.siennaNaturalsBot = async (req, res) => {
    try {
        await fulfillmentHandler(req, res);
    } catch (error) {
        console.error('Error in cloud function:', error);
        res.status(500).send('Internal Server Error');
    }
};