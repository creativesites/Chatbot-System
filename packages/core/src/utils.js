// app/api/utils.js
const { pgClient } = require('./database'); // Or your DB connection

async function getAllProducts() {
  try {
    const result = await pgClient.query('SELECT * FROM products');
    return result.rows;
  } catch (error) {
    console.error("Error fetching all products:", error);
    return [];
  }
}

async function getAllFaqs() {
  try {
    const result = await pgClient.query('SELECT * FROM faqs');
    return result.rows;
  } catch (error) {
    console.error("Error fetching all FAQs:", error);
    return [];
  }
}

async function getAllYoutubeVideos() { // New function to get ALL YouTube Videos
  try {
    const result = await pgClient.query('SELECT * FROM youtube_videos');
    return result.rows;
  } catch (error) {
    console.error("Error fetching all YouTube videos:", error);
    return [];
  }
}

async function getAllTestimonials() { // New function to get ALL Testimonials
  try {
    const result = await pgClient.query('SELECT * FROM testimonials');
    return result.rows;
  } catch (error) {
    console.error("Error fetching all testimonials:", error);
    return [];
  }
}

async function getAdditionalInstructions() { // New function to get ALL Bot Instructions
  try {
    const result = await pgClient.query('SELECT * FROM bot_instructions');
    return result.rows;
  } catch (error) {
    console.error("Error fetching bot instructions:", error);
    return [];
  }
}
async function getHairIssuesForUser(userId){
  //return empty for now
  return []
}
async function getProductByName(productName) {
  try {
    const result = await pgClient.query('SELECT product_id FROM products WHERE product_name = $1', [productName]);
    return result.rows[0]; // Returns the product object, or undefined if not found
  } catch (error) {
    console.error("Error fetching product by name:", error);
    return null; // or undefined, depending on your preference
  }
}

// Function to add product recommendation to the database
async function addProductRecommendation(userId, conversationId, productId, reasonForRecommending) {
  try {
    const query = `
            INSERT INTO product_recommendations (user_id, conversation_id, product_id, reason_for_recommending)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
    const values = [userId, conversationId, productId, reasonForRecommending];
    const result = await pgClient.query(query, values);
    return { success: true, recommendation: result.rows[0] }; // Return success and the new recommendation
  } catch (error) {
    console.error("Error adding product recommendation:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getAllProducts,
  getAllFaqs,
  getAllYoutubeVideos,
  getAllTestimonials,
  getAdditionalInstructions,
  getHairIssuesForUser,
  getProductByName,
  addProductRecommendation
};