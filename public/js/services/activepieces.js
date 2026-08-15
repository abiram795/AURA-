console.log("Webhook started");

fetch("https://cloud.activepieces.com/api/v1/webhooks/BVI9LOhVwkWEbkEQ3bEEd", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    test: "hello"
  })
})
  .then(res => console.log("Success", res.status))
  .catch(err => console.log("Error", err));