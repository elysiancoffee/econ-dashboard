"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

type Item = {
  name: string;
  votes: string;
};

export default function ItemPollResultsGenerator() {
  const [round, setRound] = useState("");
  const [theme, setTheme] = useState("");
  const [totalVoters, setTotalVoters] = useState("");
  const [threeOfThree, setThreeOfThree] = useState("");
  const [twoOfThree, setTwoOfThree] = useState("");
  const [oneOfThree, setOneOfThree] = useState("");
  const [copied, setCopied] = useState(false);

  const [items, setItems] = useState<Item[]>(
    Array.from({ length: 10 }, () => ({
      name: "",
      votes: "",
    }))
  );

  const updateItem = (
    index: number,
    field: keyof Item,
    value: string
  ) => {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const generatedCode = useMemo(() => {
    const validItems = items
      .map((item, index) => ({
        ...item,
        index,
        voteCount: Number(item.votes) || 0,
      }))
      .filter(
        (item) =>
          item.name.trim() !== "" ||
          item.votes.trim() !== ""
      );

    const topThreeIndexes = new Set(
      [...validItems]
        .sort((a, b) => b.voteCount - a.voteCount)
        .slice(0, 3)
        .map((item) => item.index)
    );

    const totalVotes = validItems.reduce(
      (sum, item) => sum + item.voteCount,
      0
    );

    const itemResults = validItems
      .map((item) => {
        const color = topThreeIndexes.has(item.index)
          ? "#e1bc28"
          : "#926766";

        const voteLabel =
          item.voteCount === 1 ? "vote" : "votes";

        return `[color=${color}]${item.name.trim()}: ${item.voteCount} ${voteLabel}[/color]`;
      })
      .join("\n");

    return `[center][img]https://i.imgur.com/5CRL98n.png[/img]

[b][size=4][color=#bf464b]ROUND ${round} - RESULTS[/color][/size][/b]
[color=#a68b9d]Theme: ${theme}[/color]

[hr][color=#e1bc28]Total Voters: ${totalVoters} voters
(Items in gold color denotes the 3 most voted items)[/color]

${itemResults}

[Color=#a68b9d]Total Votes: ${totalVotes} votes[/color]

[hr][b][size=3][color=#bf464b]W I N N E R S [/color][/size][/b]

[color=#926766]All users who voted 3 out of 3 most desirable items will get:
[img]https://img.hexrpg.com/images/items/giftcard50k.png[/img][/color]
[color=white]
${threeOfThree}
[/color]

[color=#926766]All users who voted 2 out of 3 most desirable items will get:
[img]https://img.hexrpg.com/images/items/giftcard25k.png[/img][/color]
[color=white]
${twoOfThree}
[/color]

[color=#926766]All users who voted 1 out of 3 most desirable items will get:
[img]https://img.hexrpg.com/images/items/giftcard10k.png[/img][/color]
[color=white]
${oneOfThree}
[/color]

[color=#926766]Your prizes will be sent to you shortly by the club. Congratulations! Please keep this thread on watch for the next poll. [/color][/center]

[size=2][color=white]Edited by CrimsonCurse[/color][/size]`;
  }, [
    round,
    theme,
    totalVoters,
    items,
    threeOfThree,
    twoOfThree,
    oneOfThree,
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
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle>Poll Results</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Round + Theme */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Round Number</Label>
              <Input
                type="number"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                placeholder="e.g. 60"
              />
            </div>

            <div className="space-y-2">
              <Label>Theme</Label>
              <Input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. Rainbow"
              />
            </div>
          </div>

          {/* Total Voters */}
          <div className="space-y-2">
            <Label>Total Voters</Label>
            <Input
              type="number"
              value={totalVoters}
              onChange={(e) => setTotalVoters(e.target.value)}
              placeholder="e.g. 14"
            />
          </div>

          {/* Item Results */}
          <div className="space-y-3">
            <Label>Item Results</Label>

            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_120px] gap-3"
              >
                <Input
                  value={item.name}
                  onChange={(e) =>
                    updateItem(index, "name", e.target.value)
                  }
                  placeholder={`Item ${index + 1} name`}
                />

                <Input
                  type="number"
                  min="0"
                  value={item.votes}
                  onChange={(e) =>
                    updateItem(index, "votes", e.target.value)
                  }
                  placeholder="Votes"
                />
              </div>
            ))}
          </div>

          {/* Winners */}
          <div className="space-y-2">
            <Label>3/3 Correct</Label>
            <Textarea
              value={threeOfThree}
              onChange={(e) => setThreeOfThree(e.target.value)}
              placeholder={"Username1\nUsername2\nUsername3"}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>2/3 Correct</Label>
            <Textarea
              value={twoOfThree}
              onChange={(e) => setTwoOfThree(e.target.value)}
              placeholder={"Username1\nUsername2\nUsername3"}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>1/3 Correct</Label>
            <Textarea
              value={oneOfThree}
              onChange={(e) => setOneOfThree(e.target.value)}
              placeholder={"Username1\nUsername2\nUsername3"}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Generated Code Card */}
      <Card className="lg:sticky lg:top-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Generated Code</CardTitle>

          <Button
            variant="outline"
            size="sm"
            onClick={copyCode}
          >
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
            className="min-h-[700px] font-mono text-xs"
          />
        </CardContent>
      </Card>
    </div>
  );
}