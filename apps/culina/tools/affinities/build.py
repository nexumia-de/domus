#!/usr/bin/env python3
"""Writes packages/app/data/affinities.json from the table below.

The table is the project's own judgement of which ingredients cooks commonly put together
(docs/decisions/own-recipes.md, point 6): written by an AI model from general cooking knowledge,
from no source, checked by no cook. Each row names an ingredient of the catalogue and its
partners; a pair holds in both directions, so it is written once. Run from apps/culina:
    python3 tools/affinities/build.py
"""
import json
import sys

A = {
    'tomato': 'fdc-group-tomatoes', 'tomato-paste': 'fdc-170459', 'garlic': 'fdc-169230',
    'onion': 'fdc-170000', 'shallot': 'fdc-170499', 'scallion': 'fdc-170005', 'leek': 'fdc-169246',
    'basil': 'fdc-172232', 'parsley': 'fdc-170416', 'thyme': 'fdc-173470', 'rosemary': 'fdc-173473',
    'bay': 'fdc-170917', 'sage': 'fdc-170935', 'marjoram': 'fdc-170928', 'mint': 'fdc-173475',
    'dill': 'fdc-171322', 'coriander-leaf': 'fdc-169997', 'olive-oil': 'fdc-171413',
    'butter': 'fdc-group-butter', 'cream': 'fdc-group-cream', 'sour-cream': 'fdc-171256',
    'milk': 'fdc-group-milk', 'egg': 'fdc-group-egg', 'mozzarella': 'fdc-170900',
    'parmesan': 'fdc-group-cheese-parmesan', 'ricotta': 'fdc-group-cheese-ricotta',
    'gruyere': 'fdc-171242', 'pasta': 'fdc-group-pasta', 'rice': 'fdc-group-rice',
    'potato': 'fdc-170028', 'bread': 'fdc-group-bread', 'breadcrumbs': 'fdc-174928',
    'lemon-juice': 'fdc-167747', 'lemon-zest': 'fdc-167749', 'lime': 'fdc-168155',
    'orange': 'fdc-group-oranges', 'vinegar': 'fdc-group-vinegar', 'balsamic': 'fdc-172241',
    'white-wine': 'fdc-174837', 'red-wine': 'fdc-173190', 'chicken': 'fdc-group-chicken-broilers-or-fryers',
    'beef': 'fdc-group-beef', 'pork': 'fdc-group-pork', 'lamb': 'fdc-group-lamb', 'bacon': 'fdc-168277',
    'fish': 'fdc-group-fish', 'salmon': 'fdc-173686', 'shrimp': 'fdc-174210', 'anchovy': 'fdc-174182',
    'mushroom': 'fdc-group-mushrooms', 'spinach': 'fdc-168462', 'carrot': 'fdc-170393',
    'celery': 'fdc-169988', 'zucchini': 'fdc-169291', 'sweet-pepper': 'fdc-group-peppers-sweet',
    'chili': 'fdc-group-peppers-hot-chili', 'cucumber': 'fdc-169225', 'cabbage': 'fdc-group-cabbage-common',
    'red-cabbage': 'fdc-169977', 'cauliflower': 'fdc-169986', 'peas': 'fdc-170419',
    'green-beans': 'fdc-169961', 'asparagus': 'fdc-168389', 'beetroot': 'fdc-169145',
    'fennel': 'fdc-169385', 'rocket': 'fdc-169387', 'corn': 'fdc-169998', 'lentils': 'fdc-172420',
    'chickpeas': 'fdc-173756', 'beans': 'fdc-group-beans', 'ginger': 'fdc-169231',
    'coriander-seed': 'fdc-170922', 'curry': 'fdc-170924', 'turmeric': 'fdc-172231',
    'paprika': 'fdc-171329', 'caraway': 'fdc-170918', 'cinnamon': 'fdc-171320', 'nutmeg': 'fdc-171326',
    'mustard': 'fdc-170929', 'honey': 'fdc-169640', 'sugar': 'fdc-group-sugars', 'vanilla': 'fdc-173471',
    'cocoa': 'fdc-169593', 'coconut-milk': 'fdc-170172', 'sesame': 'fdc-170150', 'sesame-oil': 'fdc-171016',
    'tahini': 'fdc-group-seeds-sesame-butter-tahini', 'peanut': 'fdc-group-peanuts',
    'almond': 'fdc-170568', 'pine-nut': 'fdc-170591', 'apple': 'fdc-group-apples', 'pear': 'fdc-167777',
    'strawberry': 'fdc-167762', 'raspberry': 'fdc-167755',
}

T = {
    'tomato': 'basil garlic olive-oil onion mozzarella parmesan balsamic sweet-pepper zucchini chili pasta thyme anchovy',
    'garlic': 'olive-oil parsley chili lemon-juice rosemary thyme ginger mushroom shrimp spinach chicken lamb potato',
    'onion': 'butter thyme bay carrot celery beef bacon paprika caraway vinegar potato',
    'basil': 'mozzarella pine-nut parmesan olive-oil lemon-juice zucchini strawberry',
    'potato': 'butter rosemary parsley cream leek bacon nutmeg dill caraway sour-cream milk',
    'pasta': 'parmesan olive-oil butter garlic cream bacon egg mushroom spinach',
    'rice': 'butter onion peas coconut-milk turmeric curry scallion egg lime',
    'chicken': 'lemon-juice thyme rosemary garlic paprika cream mushroom curry ginger white-wine honey',
    'beef': 'red-wine thyme bay carrot mushroom mustard rosemary celery paprika',
    'pork': 'apple sage mustard caraway cabbage marjoram honey fennel',
    'lamb': 'rosemary garlic mint thyme lemon-juice chickpeas',
    'fish': 'lemon-juice dill butter parsley white-wine fennel potato',
    'salmon': 'dill lemon-juice cream cucumber mustard honey ginger asparagus',
    'shrimp': 'garlic chili lemon-juice parsley lime coconut-milk ginger',
    'egg': 'butter bacon parsley gruyere cream spinach mushroom scallion',
    'mushroom': 'butter garlic parsley thyme cream white-wine shallot',
    'spinach': 'garlic nutmeg cream ricotta parmesan lemon-juice chickpeas',
    'carrot': 'butter ginger parsley honey orange celery peas',
    'zucchini': 'garlic olive-oil mint lemon-juice parmesan thyme',
    'sweet-pepper': 'onion garlic olive-oil paprika chili',
    'cucumber': 'dill vinegar sour-cream mint sesame garlic',
    'cabbage': 'caraway bacon apple vinegar onion carrot',
    'red-cabbage': 'apple vinegar bay cinnamon sugar onion',
    'cauliflower': 'butter breadcrumbs curry nutmeg gruyere',
    'peas': 'mint butter bacon shallot',
    'green-beans': 'butter garlic bacon shallot almond',
    'asparagus': 'butter lemon-juice egg parmesan',
    'beetroot': 'vinegar dill apple caraway sour-cream',
    'fennel': 'orange lemon-juice olive-oil parmesan',
    'rocket': 'parmesan balsamic olive-oil pear pine-nut',
    'corn': 'butter chili lime coriander-leaf',
    'lentils': 'carrot celery onion bay vinegar turmeric curry bacon',
    'chickpeas': 'tahini lemon-juice garlic olive-oil paprika coriander-leaf curry',
    'beans': 'garlic onion chili coriander-leaf lime bacon bay tomato',
    'ginger': 'scallion sesame-oil chili lime coconut-milk honey coriander-leaf',
    'coconut-milk': 'curry lime chili coriander-leaf turmeric',
    'sesame': 'sesame-oil honey scallion',
    'peanut': 'lime chili coconut-milk ginger',
    'cream': 'vanilla white-wine mustard nutmeg',
    'butter': 'lemon-juice parsley sage nutmeg',
    'apple': 'cinnamon butter sugar vanilla lemon-juice almond',
    'pear': 'cinnamon red-wine vanilla',
    'strawberry': 'cream sugar vanilla balsamic mint',
    'raspberry': 'cream vanilla cocoa sugar',
    'cocoa': 'vanilla cream sugar orange almond cinnamon',
    'lemon-juice': 'olive-oil parsley honey mustard',
    'vinegar': 'mustard olive-oil honey shallot',
    'bread': 'butter garlic olive-oil tomato',
    'ricotta': 'lemon-zest honey nutmeg',
    'bacon': 'egg leek',
    'leek': 'cream butter thyme',
    'orange': 'cinnamon honey almond',
    'milk': 'vanilla cinnamon sugar nutmeg',
}


def main():
    cat = {i['id'] for i in json.load(open('packages/app/data/ingredient-catalogue.json'))['ingredients']}
    missing = sorted({v for v in A.values() if v not in cat})
    if missing:
        sys.exit(f'not in the catalogue: {missing}')
    pairs = {}
    for anchor, partners in T.items():
        if anchor not in A:
            sys.exit(f'unknown anchor {anchor}')
        row = []
        for p in partners.split():
            if p not in A:
                sys.exit(f'{anchor}: unknown partner {p}')
            if p == anchor or A[p] in row:
                sys.exit(f'{anchor}: {p} twice or itself')
            row.append(A[p])
        pairs[A[anchor]] = row
    out = {
        'format': 'culina-affinities',
        'formatVersion': 1,
        'written': '2026-11-23',
        'basis': "The project's own judgement of which ingredients cooks commonly put together: written by an AI model from general cooking knowledge, from no source, checked by no cook (docs/decisions/own-recipes.md). A pair holds in both directions.",
        'licence': 'AGPL-3.0-or-later, as the project',
        'pairs': pairs,
    }
    with open('packages/app/data/affinities.json', 'w') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(len(pairs), 'ingredients,', sum(len(v) for v in pairs.values()), 'pairs written')


main()
