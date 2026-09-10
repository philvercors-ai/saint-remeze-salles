from django.db import migrations


def backfill_account_type(apps, schema_editor):
    """Comptes créés avant l'ajout du champ account_type (v1.10.0) : ceux qui
    avaient déjà renseigné un nom d'association sont reclassés "association",
    les autres restent au défaut "particulier" (déjà appliqué à la création)."""
    CustomUser = apps.get_model("accounts", "CustomUser")
    CustomUser.objects.filter(association__gt="").update(account_type="association")


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_customuser_account_type_customuser_rna_number_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_account_type, migrations.RunPython.noop),
    ]
