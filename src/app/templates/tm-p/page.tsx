"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

type Prize = {
  image: string;
  name: string;
  chips: string;
};

export default function MosaicGenerator() {
  const [bannerImage, setBannerImage] = useState(
    "https://elysiancoffee.github.io/uploads/themosaic-july.png"
  );
  const [edition, setEdition] = useState("2");
  const [month, setMonth] = useState("july");
  const [puzzleType, setPuzzleType] = useState("dingbat puzzles");

  const [introduction, setIntroduction] = useState(
    `...Good question! So we were getting tired from the boredom around the club. *Yawns* Sorry. The Mosaic is a puzzle series where we will monthly release new puzzles, party games, fun quizzes, and what not! After all, who does not like running their brains up to a point where they instead just find slamming their device down on the floor easier? 8)`
  );

  const [activityDescription, setActivityDescription] = useState(
    `For this month, we have rebus/dingbat puzzles for you to solve! Rebus or Dingbat puzzles are a combination of letters, symbols or images that, when combined together using trickery, mean a widely used word, phrase, or concept in our daily language.

Please note that this is a [u]group task[/u]. Everyone present in this thread will work together to figure out answers of the image that is currently present in the [u]SECOND POST[/u] and pinned post of this thread. You all are free to discuss answers amongst yourselves in this thread. Once a finalized answer is present, you may tag @Ri or @Bearsy with your answer, whoever is online. BUT, be careful, if you tag us with a wrong guess, there will be a penalty!

The puzzles are in levels and in an increasing order of difficulty as they go too. Each correctly guessed answer will award everyone 1 point, each incorrectly guessed answer will deduct 2 points from the counter. So ensure that you only tag us once you're very sure of an answer. While it's very rare, a dingbat might have more than one answer. In that case, any will be accepted.`
  );

  const [rules, setRules] = useState(
    `1. All HEX terms must be followed.
2. You can only make a guess for the currently available puzzle in the pinned post, only once that level is solved, you might move on.
3. Each round you participate in will earn you 1 ticket. Do not worry about missing any rounds, we have endless puzzles, if we run out of these 50.
4. As this is a group activity, do not try to play all by yourself. If you submit wrong answers without discussing first with everyone, your guess will be ignored. The correct ones will pass, however, as the answer would have been revealed already.
5. Everyone who participates in this contest at least once will earn 1 Black chip to the Black Archive incentive.
6. If you got any questions, please post them in this thread or owl [url=/owl/ri]Simone[/url] or [url=/owl/Bearsy]Rosa[/url].`
  );

  const [prizes, setPrizes] = useState<Prize[]>([
    {
      image: "https://img.hexrpg.com/images/items/GinnyPlush.png",
      name: "Ginny Plushie",
      chips: "30",
    },
    {
      image: "https://img.hexrpg.com/images/items/lepgold.gif",
      name: "1,000,000 Galleons",
      chips: "20",
    },
    {
      image: "https://img.hexrpg.com/images/items/lepgold.gif",
      name: "1,000,000 Galleons",
      chips: "10",
    },
    {
      image: "https://img.hexrpg.com/images/items/lepgold.gif",
      name: "500,000 Galleons",
      chips: "5",
    },
    {
      image: "",
      name: "",
      chips: "5",
    },
  ]);

  const [editor, setEditor] = useState("Ri");
  const [copied, setCopied] = useState(false);

  const updatePrize = (
    index: number,
    field: keyof Prize,
    value: string
  ) => {
    setPrizes((current) =>
      current.map((prize, i) =>
        i === index ? { ...prize, [field]: value } : prize
      )
    );
  };

  const generatedCode = useMemo(() => {
    const positions = ["First", "Second", "Third", "Fourth", "Fifth"];

    const prizeCode = prizes
      .map((prize, index) => {
        const image = prize.image.trim()
          ? `[img width=30]${prize.image.trim()}[/img] `
          : "";

        const name = prize.name.trim();

        const chips = prize.chips.trim()
          ? `${prize.chips.trim()} Black ${
              prize.chips.trim() === "1" ? "Chip" : "Chips"
            }`
          : "";

        const separator = name && chips ? " & " : "";

        return `${positions[index]}: ${image}${name}${separator}${chips}`;
      })
      .join("\n");

    return `[center][img]${bannerImage}[/img]

[color=#1732c0][size=4][b]THE MOSAIC.[/size][/color]
[color=#8ec8d9][size=3]Edition ##${edition}[/size][/b]
(${month} month // ${puzzleType})
[/color][/center]

[color=#3953c1][b]Sooooo... what the heck is this again?[/b][/color]
[color=#f1fb81]${introduction}[/color]

[color=#3953c1][b]This month's trickeries![/b][/color]
[color=#f1fb81]${activityDescription}[/color]

[color=#3953c1][b]The Rules![/b][/color]
[color=#f1fb81]${rules}[/color]

[color=#3953c1][b]The Prizes![/b][/color]
[color=#f1fb81]${prizeCode}[/color]`;
  }, [
    bannerImage,
    edition,
    month,
    puzzleType,
    introduction,
    activityDescription,
    rules,
    prizes,
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
          <CardTitle>Mosaic Generator</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Banner Image</Label>
            <Input
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              placeholder="Banner image URL"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Edition</Label>
              <Input
                type="number"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="e.g. 2"
              />
            </div>

            <div className="space-y-2">
              <Label>Month</Label>
              <Input
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="e.g. july"
              />
            </div>

            <div className="space-y-2">
              <Label>Puzzle Type</Label>
              <Input
                value={puzzleType}
                onChange={(e) => setPuzzleType(e.target.value)}
                placeholder="e.g. dingbat puzzles"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Introduction</Label>
            <Textarea
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              className="min-h-[160px]"
            />
          </div>

          <div className="space-y-2">
            <Label>This Month&apos;s Trickeries</Label>
            <Textarea
              value={activityDescription}
              onChange={(e) => setActivityDescription(e.target.value)}
              className="min-h-[300px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Rules</Label>
            <Textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              className="min-h-[250px]"
            />
          </div>

          <div className="space-y-4">
            <Label>Prizes</Label>

            {prizes.map((prize, index) => (
              <div
                key={index}
                className="space-y-2 rounded-lg border p-3"
              >
                <div className="text-sm font-medium">
                  {["First", "Second", "Third", "Fourth", "Fifth"][index]}
                </div>

                <Input
                  value={prize.image}
                  onChange={(e) =>
                    updatePrize(index, "image", e.target.value)
                  }
                  placeholder="Prize image URL (optional)"
                />

                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <Input
                    value={prize.name}
                    onChange={(e) =>
                      updatePrize(index, "name", e.target.value)
                    }
                    placeholder="Prize name"
                  />

                  <Input
                    type="number"
                    value={prize.chips}
                    onChange={(e) =>
                      updatePrize(index, "chips", e.target.value)
                    }
                    placeholder="Chips"
                  />
                </div>
              </div>
            ))}
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