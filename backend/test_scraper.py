import asyncio, sys, json
sys.path.insert(0, '.')

async def main():
    from scrapers.yad2 import scrape_yad2
    results = await scrape_yad2()
    print(f"\n=== Got {len(results)} listings ===")
    for r in results[:3]:
        print(f"  {r['city']} | {r['street']} {r['street_number']} | {r['rooms']}חד | {r['size_sqm']}מ\"ר | ₪{r['price']:,}")

asyncio.run(main())
