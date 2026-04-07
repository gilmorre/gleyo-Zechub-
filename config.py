from playwright.sync_api import sync_playwright

def scrape_profile_info(url: str):
    _xhr_calls = []
    def intercept_response(response):
        if response.request.resource_type == "xhr":
            _xhr_calls.append(response)
        return response
    
    with sync_playwright() as p:
        broswer = p.chromium.launch(headless=False)
        context = broswer.new_context(viewport={"width":1920, "height":1080})
        page = context.new_page()
        page.on("response", intercept_response)


        page.goto(url)

        page.wait_for_selector("[data-testid='primaryColumn']")

        usercalls = [f for f in _xhr_calls if "UserBy" in f.url]
        for uc in usercalls:
            data = uc.json()
            return data['data']['user']['result']
        


print(scrape_profile_info("https://x.com/UNA_tics"))