from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reservations', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='reservation',
            name='recurrence_group',
            field=models.CharField(blank=True, db_index=True, max_length=36, verbose_name='Groupe récurrence'),
        ),
    ]
