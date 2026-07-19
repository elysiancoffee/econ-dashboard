"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function ClubUpdateGenerator() {
  const [mosaicBanner, setMosaicBanner] = useState(
    "https://elysiancoffee.github.io/uploads/themosaic-july.png"
  );
  const [mosaicText, setMosaicText] = useState(
    `Gather 'round folks, for this month's trickeries cannot start without others. There are many confusing things in the world - but the solution to all is... MOSAIC SERIES! :D That's right my goodfellas! It's time for all of you to use your brains once again as I challenge you to a game of [url=/f/315333/255702]Dingbat Puzzles[/url]. I already know who's gonna lose. /shifty`
  );

  const [activityGif, setActivityGif] = useState(
    "https://64.media.tumblr.com/a3a62a663a8382aeb61635db223feb97/4cebd41dda67305a-ae/s540x810/04ead62af032f41be8afa9d2ffb72b052027e25c.gif"
  );
  const [activityJapaneseTitle, setActivityJapaneseTitle] =
    useState("呪術廻戦");
  const [activityTitle, setActivityTitle] =
    useState("Jujutsu Kaisen Mafia");
  const [activityText, setActivityText] = useState(
    `Your favorite - mafia games have returned. Get your wits and guns about, and get here in the downtown with us, as we banish Evil Cursed Spirits trying to infiltrate our headquarters, in the [url=/f/315333/255703]Jujutsu Kaisen Mafia[/url]. *Begins chanting* "Emerge from the darkness, blacker than darkness. Purify that which is impure."`
  );

  const [blackArchiveLink, setBlackArchiveLink] = useState(
    "https://www.hexrpg.com/f/315333/254093"
  );
  const [itemPollLink, setItemPollLink] = useState(
    "https://www.hexrpg.com/f/315333/250704?page=7#8402023"
  );
  const [applicationsLink, setApplicationsLink] = useState(
    "https://www.hexrpg.com/f/315333/252487"
  );
  const [celebrationLink, setCelebrationLink] = useState(
    "https://www.hexrpg.com/f/315333/250710"
  );
  const [marketingLink, setMarketingLink] = useState(
    "https://www.hexrpg.com/f/315333/252319"
  );
  const [handmaidsLink, setHandmaidsLink] = useState(
    "https://www.hexrpg.com/f/315333/253590"
  );
  const [priceCheckingLink, setPriceCheckingLink] = useState(
    "https://www.hexrpg.com/f/315333/250881"
  );

  const [copied, setCopied] = useState(false);

  const generatedCode = useMemo(() => {
    return `[center][img]${mosaicBanner}[/img]

[color=#3953c1]${mosaicText}[/color]   
[hr][img width=400]${activityGif}[/img]

[color=#a23410][size=6]${activityJapaneseTitle}[/size]
[size=5][face=glass Antiqua]${activityTitle}[/face][/size]

${activityText}[/color][hr][color=white][b]...::: OTHER LINKS TO CHECK OUT :::...[/b]

[url=${blackArchiveLink}]The Black Archive[/url]
[url=${itemPollLink}]Item Poll[/url] (*NEW ROUND) ◇ [url=${applicationsLink}]Applications[/url]
[url=${celebrationLink}]Celebration Conundrum[/url] ◇ [url=${marketingLink}]Marketing Incentive[/url] ◇ [url=${handmaidsLink}]Handmaid's Help[/url] ◇ [url=${priceCheckingLink}]Price Checking[/url][/color]
[/center]`;
  }, [
    mosaicBanner,
    mosaicText,
    activityGif,
    activityJapaneseTitle,
    activityTitle,
    activityText,
    blackArchiveLink,
    itemPollLink,
    applicationsLink,
    celebrationLink,
    marketingLink,
    handmaidsLink,
    priceCheckingLink,
  ]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success("Code copied to clipboard.");

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Club Update Generator</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Mosaic Banner</Label>
            <Input
              value={mosaicBanner}
              onChange={(e) => setMosaicBanner(e.target.value)}
              placeholder="Banner image URL"
            />
          </div>

          <div className="space-y-2">
            <Label>Mosaic Announcement</Label>
            <Textarea
              value={mosaicText}
              onChange={(e) => setMosaicText(e.target.value)}
              className="min-h-[180px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Second Activity GIF / Image</Label>
            <Input
              value={activityGif}
              onChange={(e) => setActivityGif(e.target.value)}
              placeholder="GIF or image URL"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Activity Display Title</Label>
              <Input
                value={activityJapaneseTitle}
                onChange={(e) =>
                  setActivityJapaneseTitle(e.target.value)
                }
                placeholder="e.g. 呪術廻戦"
              />
            </div>

            <div className="space-y-2">
              <Label>Activity Title</Label>
              <Input
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                placeholder="e.g. Jujutsu Kaisen Mafia"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Activity Announcement</Label>
            <Textarea
              value={activityText}
              onChange={(e) => setActivityText(e.target.value)}
              className="min-h-[180px]"
            />
          </div>

          <div className="space-y-4">
            <Label>Other Links</Label>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                The Black Archive
              </Label>
              <Input
                value={blackArchiveLink}
                onChange={(e) => setBlackArchiveLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Item Poll
              </Label>
              <Input
                value={itemPollLink}
                onChange={(e) => setItemPollLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Applications
              </Label>
              <Input
                value={applicationsLink}
                onChange={(e) => setApplicationsLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Celebration Conundrum
              </Label>
              <Input
                value={celebrationLink}
                onChange={(e) => setCelebrationLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Marketing Incentive
              </Label>
              <Input
                value={marketingLink}
                onChange={(e) => setMarketingLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Handmaid&apos;s Help
              </Label>
              <Input
                value={handmaidsLink}
                onChange={(e) => setHandmaidsLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Price Checking
              </Label>
              <Input
                value={priceCheckingLink}
                onChange={(e) => setPriceCheckingLink(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Generated Code</CardTitle>

          <Button variant="outline" size="sm" onClick={copyCode}>
            {copied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </CardHeader>

        <CardContent>
          <Textarea
            value={generatedCode}
            readOnly
            className="min-h-[800px] font-mono text-xs"
          />
        </CardContent>
      </Card>
    </div>
  );
}