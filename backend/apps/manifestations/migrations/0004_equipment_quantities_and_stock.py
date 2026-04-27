import django_mongodb_backend.fields
from django.db import migrations, models


INITIAL_STOCK = [
    ("Tables", 30),
    ("Chaises", 100),
    ("Estrade", 1),
    ("Sono", 2),
    ("Vidéoprojecteur", 2),
    ("Éclairage", 1),
]


def create_stock(apps, schema_editor):
    EquipmentStock = apps.get_model("manifestations", "EquipmentStock")
    for name, qty in INITIAL_STOCK:
        EquipmentStock.objects.get_or_create(name=name, defaults={"total_quantity": qty})


class Migration(migrations.Migration):
    dependencies = [("manifestations", "0003_manifestation_location_fields")]

    operations = [
        migrations.CreateModel(
            name="EquipmentStock",
            fields=[
                ("id", django_mongodb_backend.fields.ObjectIdAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True, verbose_name="Équipement")),
                ("total_quantity", models.PositiveIntegerField(default=1, verbose_name="Quantité totale")),
            ],
            options={
                "verbose_name": "Stock logistique",
                "verbose_name_plural": "Stocks logistiques",
                "ordering": ["name"],
            },
        ),
        migrations.AddField(
            model_name="manifestation",
            name="equipment_quantities",
            field=models.JSONField(blank=True, default=dict, verbose_name="Quantités logistiques"),
        ),
        migrations.RunPython(create_stock, migrations.RunPython.noop),
    ]
