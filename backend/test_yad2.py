import httpx, json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://www.yad2.co.il/',
    'Origin': 'https://www.yad2.co.il',
}

results = {}

with httpx.Client(headers=headers, follow_redirects=True, timeout=20) as c:
    try:
        c.get('https://www.yad2.co.il/', timeout=10)
    except Exception as e:
        results['homepage'] = str(e)

    try:
        r = c.get(
            'https://gw.yad2.co.il/feed-search-legacy/realestate/forsale',
            params={'city': '9700', 'minRooms': '4', 'price': '-1-3500000',
                    'propertyGroup': 'apartments', 'dealType': '1', 'rows': '5', 'page': '1'}
        )
        results['status'] = r.status_code
        results['content_type'] = r.headers.get('content-type', '')
        results['response_text'] = r.text[:1000]
    except Exception as e:
        results['error'] = str(e)

with open('C:/Users/USER/Desktop/yad2_debug.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("Done")
