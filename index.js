const puppeteer = require("puppeteer-extra");
const fs = require("fs");
const request = require("request");

const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

(async () => {
  const baseUrl = "https://local.pokemon.jp/en/manhole/desc/1/?is_modal=1";
  let currentIndex = 1;
  let active = true;
  let data = []; // Array to hold all data objects

  const browser = await puppeteer.launch({
    headless: false, // Non-headless mode
    args: ["--window-size=1920,1080"], // Window size
  });

  const page = await browser.newPage();

  await page.setViewport({ width: 1920, height: 1080 });

  while (active) {
    try {
      const url = baseUrl.replace("1/", `${currentIndex}/`);
      await page.goto(url, { waitUntil: "networkidle2" });

      // Find image source and download
      const imageSrc = await page.$eval(".heading img", (img) => img.src);
      const fullImageUrl = new URL(imageSrc, url).href;
      downloadImage(fullImageUrl, `image${currentIndex}.png`);

      // Handle iframe content
      await page.waitForSelector("iframe");
      const iframeElement = await page.$("iframe");
      const frame = await iframeElement.contentFrame();

      let placeName = "Not Available";
      let address = "Not Available";

      // Safely attempt to retrieve place name and address
      try {
        placeName = await frame.$eval(
          ".place-name",
          (element) => element.innerText
        );
      } catch (error) {
        console.log(`Place name not found at ${url}`);
      }

      try {
        address = await frame.$eval(".address", (element) => element.innerText);
      } catch (error) {
        console.log(`Address not found at ${url}`);
      }
      // Append data to array
      data.push({
        index: currentIndex,
        url: url,
        placeName: placeName,
        address: address,
        imagePath: `image${currentIndex}.png`,
      });

      console.log(`Details for ${url}:`);
      console.log(`Place Name: ${placeName}`);
      console.log(`Address: ${address}`);

      currentIndex++;
      if(currentIndex > 350){
        active = false;
        //there are no more than 350 manholes at the moment
      }
    } catch (error) {
      if (
        error.message.includes("net::ERR_ABORTED") ||
        error.message.includes("net::ERR_FAILED")
      ) {
        console.log(
          `Reached a non-existing page at index ${currentIndex}, stopping...`
        );
        active = false;
      } else {
        console.error("An error occurred:", error);
      }
    }
  }

  // Write data to JSON file
  fs.writeFileSync("output.json", JSON.stringify(data, null, 4));

  await browser.close();
})();

// Function to download image
function downloadImage(uri, filename) {
  request.head(uri, function (err, res, body) {
    if (err) {
      console.log("Failed to download image:", err);
      return;
    }
    request(uri).pipe(fs.createWriteStream(filename));
  });
}

// Function to create a timeout
function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
