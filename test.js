const a = [
    {
      "conversation_id": "110232086",
      "user_id": "UmVMOS4iCmsdTWbIwz5LVTnzM2YAq4zj",
      "created_at": "2025-03-11T19:02:59.006Z",
      "summary": "conversation summary not available.",
      "chat_history": [
        {
          "role": "user",
          "content": "2025-03-11T19:02:53.217Z - User Said: hello, i'm tinashe. i have dry hair today"
        },
        {
          "role": "assistant",
          "content": {
            "payload": {
              "message": "<html><head><style>body { font-family: Archivo, sans-serif; } h3 { font-size: 1.0em;font-weight: 600; color:#222323;} p { color: #383838; font-size: 0.8em; letter-spacing: 0;} span{color:#222323;letter-spacing: 1px;}</style></head><body><h3>Addressing your dry hair</h3><p>Dry hair can be frustrating, Tinashe. Retaining moisture in the hair is dictated by its porosity, impacting its ability to absorb and retain liquids. To help, let's ensure your strands are free from product build-up, heavy butters, oils, and wax residue. I suggest detoxing with a clarifying shampoo consistently.</p><p>If you'd like a more personalized plan, I recommend our HairSI™ analysis kit. It can provide detailed insights into your hair's condition, including porosity. Steam therapy treatments also work wonders.</p></body></html>",
              "metadata": {
                "payload": [
                  {
                    "title": "Learn more about HairSI™",
                    "message": "Tell me more about HairSI™ and how it can help with dry hair."
                  },
                  {
                    "title": "Explore virtual consultations",
                    "message": "Suggest a virtual consultation so I can discuss more with a professional"
                  }
                ],
                "templateId": "6",
                "contentType": "300"
              },
              "platform": "kommunicate",
              "messageType": "html"
            }
          }
        },
        {
          "role": "user",
          "content": "2025-03-11T19:29:32.708Z - User Said: who owns myavana?"
        },
        {
          "role": "assistant",
          "content": {
            "message": "<html><head><style>body { font-family: Archivo, sans-serif; } h3 { font-size: 1.0em;font-weight: 600; color:#222323;} p { color: #383838; font-size: 0.8em; letter-spacing: 0;} span{color:#222323;letter-spacing: 1px;}</style></head><body><h3>MYAVANA's Owner</h3><p>MYAVANA is founded and owned by Candace Mitchell Harris. It is a pioneering beauty tech company founded in 2012, with the aim of revolutionizing personal and professional textured hair care through data driven science and technology.</p></body></html>",
            "platform": "kommunicate",
            "messageType": "html"
          }
        },
        {
          "role": "user",
          "content": "2025-03-11T19:54:12.342Z - User Said: who owns myavana?"
        },
        {
          "role": "assistant",
          "content": {
            "message": "<html><head><style>body { font-family: Archivo, sans-serif; } h3 { font-size: 1.0em;font-weight: 600; color:#222323;} p { color: #383838; font-size: 0.8em; letter-spacing: 0;} span{color:#222323;letter-spacing: 1px;}</style></head><body><h3>MYAVANA's Owner</h3><p>MYAVANA is founded and owned by Candace Mitchell Harris. It is a pioneering beauty tech company founded in 2012, with the aim of revolutionizing personal and professional textured hair care through data driven science and technology.</p></body></html>",
            "platform": "kommunicate",
            "messageType": "html"
          }
        },
        {
          "role": "user",
          "content": "2025-03-11T20:16:37.990Z - User Said: My hair analysis results are not showing up"
        },
        {
          "role": "assistant",
          "content": {
            "message": "<html><head><style>body { font-family: Archivo, sans-serif; } h3 { font-size: 1.0em;font-weight: 600; color:#222323;} p { color: #383838; font-size: 0.8em; letter-spacing: 0;} span{color:#222323;letter-spacing: 1px;}</style></head><body><h3>Sorry about that!</h3><p>Analysis results are made available 10-15 business days after your samples have been received by our lab. Contact our support team at hello@myavana.com if your results don't appear after that timeframe.</p></body></html>",
            "messageType": "html"
          }
        },
        {
          "role": "user",
          "content": "2025-03-12T15:52:59.959Z - User Said: If I have oily scalp and dry ends, what should I do?"
        },
        {
          "role": "assistant",
          "content": {
            "message": "<html><head><style>body { font-family: Archivo, sans-serif; } h3 { font-size: 1.0em;font-weight: 600; color:#222323;} p { color: #383838; font-size: 0.8em; letter-spacing: 0;} span{color:#222323;letter-spacing: 1px;}</style></head><body><h3>Balancing Oily Scalp & Dry Ends</h3><p>An oily scalp and dry ends can be tricky! I recommend cleansing your scalp regularly. Try to avoid excessive product and sweat buildup. Clarifying shampoos cut through product buildup and oils to leave your hair super-clean, but use them in moderation. Apply conditioner mainly to your ends, avoiding the scalp.</p><p>This is a common concern that can benefit from a more personalized approach. I'd recommend a virtual consultation with one of our hair experts for tailored advice!</p></body></html>",
            "messageType": "html"
          }
        }
      ],
      "user_name": "Tinashe"
    }
  ]

  function test(){
    const conversations = a;
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Initialize counters
    let totalMessagesToday = 0;
    const newUsersToday = new Set();
    let servicesRecommendedToday = 0;
    const userMessageCounts = {};

    // Process each conversation
    conversations.forEach((conversation) => {
      const userId = conversation.user_id;
      const userName = conversation.user_name || `User ${userId}`;

      // Filter user messages for today
      const todayUserMessages = conversation.chat_history.filter((msg) => {
        if (msg.role === "user") {
          // Extract timestamp from content
          const timestamp = msg.content.split(" - ")[0];
          console.log(timestamp)
          return timestamp.startsWith(today);
        }
        return false;
      });

      // Update total messages today
      totalMessagesToday += todayUserMessages.length;

      // Update new users today
      if (todayUserMessages.length > 0) {
        newUsersToday.add(userId);
      }

      // Update user-wise message counts
      if (userMessageCounts[userId]) {
        userMessageCounts[userId].message_count += todayUserMessages.length;
      } else {
        userMessageCounts[userId] = {
          user_name: userName,
          message_count: todayUserMessages.length,
        };
      }

      // Count services recommended today (based on assistant messages)
      conversation.chat_history.forEach((msg) => {
        if (
          msg.role === "assistant" &&
          msg.content?.message?.toLowerCase().includes("recommend")
        ) {
          servicesRecommendedToday++;
        }
      });
      console.log('totalMessagesToday', totalMessagesToday)
      console.log('newUsersToday', newUsersToday.size)
      console.log('servicesRecommendedToday', servicesRecommendedToday)
    });
  }

  //test()
const b = {
  "botId": "myavana-custom-bot-ow2h6",
  "key": "5-110296366-1741886266932",
  "from": "user_2uAygJmsq76IxBil973yGk89v3F",
  "message": "can you analyze my hair if i send an image",
  "groupId": 110296366,
  "metadata": {
    "KM_CHAT_CONTEXT": {
      "kmUserLocale": "en",
      "groupId": "110296366",
      "botId": "myavana-custom-bot-ow2h6",
      "messageSource": "1",
      "applicationId": "1b88e3ba6a4a3d044f51d8407f8f54851",
      "from": "user_2uAygJmsq76IxBil973yGk89v3F",
      "attachments": []
    }
  },
  "contentType": 0,
  "applicationId": "1b88e3ba6a4a3d044f51d8407f8f54851",
  "source": 1,
  "createdAt": 1741886266945,
  "eventName": "",
  "userInfo": {}
}