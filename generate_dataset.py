import csv
import random

nouns = ["मुलगा", "मुलगी", "शाळा", "घर", "पुस्तक"]
verbs = ["खातो", "जातो", "वाचतो", "खेळतो"]
adverbs = ["जलद", "हळू", "छान", "खूप"]

rows = []

for _ in range(100000):
    noun = random.choice(nouns)
    verb = random.choice(verbs)
    adv = random.choice(adverbs)

    incorrect = f"तो {adv} {verb}"
    correct = f"तो {adv} {verb}."

    rows.append([incorrect, correct, "auto"])

with open("marathi_dataset.csv", "w", newline='', encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["incorrect", "correct", "type"])
    writer.writerows(rows)

print("Dataset generated!")
